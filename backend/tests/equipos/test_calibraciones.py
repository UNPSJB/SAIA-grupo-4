import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient

from src.main import app
from src.equipos.services import calcular_semaforo_equipo
from tests.database import session

client = TestClient(app)


def generar_serie_unica(prefijo: str = "SN") -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


def crear_sector_auxiliar() -> int:
    res = client.post("/sectores/", json={"nombre": f"Sector_{uuid.uuid4().hex[:6]}"})
    assert res.status_code in (200, 201)
    return res.json()["id"]


def crear_equipo_auxiliar(
    frecuencia_dias: int | None = None, fecha_ultima: str | None = None
) -> int:
    sector_id = crear_sector_auxiliar()
    payload = {
        "nombre": "Balanza Digital",
        "marca": "Ohaus",
        "numero_serie": generar_serie_unica(),
        "categoria": "balanza",
        "sector_id": sector_id,
        "frecuencia_calibracion_dias": frecuencia_dias,
        "fecha_ultima_calibracion": fecha_ultima,
    }
    res = client.post("/equipos/", json=payload)
    assert res.status_code == 201, res.text
    return res.json()["id"]


# --- PRUEBAS UNITARIAS DE LÓGICA DE SEMÁFORO ---
def test_calculo_semaforo_estados():
    hoy = date.today()

    # Vencido
    proxima, dias, estado = calcular_semaforo_equipo(
        fecha_ultima=hoy - timedelta(days=32),
        frecuencia_dias=30,
        fecha_ref=hoy,
    )
    assert estado == "vencido"
    assert dias == -2

    # Próximo a vencer (dentro del umbral de 15 días)
    proxima, dias, estado = calcular_semaforo_equipo(
        fecha_ultima=hoy - timedelta(days=20),
        frecuencia_dias=30,
        fecha_ref=hoy,
    )
    assert estado == "proximo"
    assert dias == 10

    # Al día
    proxima, dias, estado = calcular_semaforo_equipo(
        fecha_ultima=hoy,
        frecuencia_dias=40,
        fecha_ref=hoy,
    )
    assert estado == "al_dia"
    assert dias == 40


# --- PRUEBAS DE INTEGRACIÓN ---
def test_registrar_calibracion_exitosa():
    equipo_id = crear_equipo_auxiliar(frecuencia_dias=60)
    hoy_str = date.today().isoformat()

    res = client.post(
        f"/equipos/{equipo_id}/calibraciones",
        data={
            "fecha_calibracion": hoy_str,
            "observaciones": "Calibración anual",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["equipo_id"] == equipo_id
    assert data["fecha_calibracion"] == hoy_str

    res_equipo = client.get(f"/equipos/{equipo_id}")
    assert res_equipo.status_code == 200
    assert res_equipo.json()["fecha_ultima_calibracion"] == hoy_str


def test_registrar_calibracion_fecha_futura_error():
    equipo_id = crear_equipo_auxiliar(frecuencia_dias=30)
    fecha_futura = (date.today() + timedelta(days=5)).isoformat()

    res = client.post(
        f"/equipos/{equipo_id}/calibraciones",
        data={"fecha_calibracion": fecha_futura},
    )
    assert res.status_code == 400


def test_endpoint_alertas_calibracion():
    hoy = date.today()
    crear_equipo_auxiliar(
        frecuencia_dias=10,
        fecha_ultima=(hoy - timedelta(days=20)).isoformat(),
    )

    res = client.get("/equipos/alertas/calibracion")
    assert res.status_code == 200
    alertas = res.json()
    assert isinstance(alertas, list)
    assert len(alertas) >= 1
    primera = alertas[0]
    assert "entidad" in primera
    assert "proxima_fecha" in primera
    assert "dias_restantes" in primera
    assert "estado" in primera