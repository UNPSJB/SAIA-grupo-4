from datetime import date, timedelta
from fastapi.testclient import TestClient
from src.main import app
from src.recambios.constants import Constantes, EstadoRecambio
from src.recambios.services import calcular_estado
from tests.database import session

client = TestClient(app)


# Funciones auxiliares de elementos de limpieza
def crear_tipo_auxiliar():
    res = client.post("/tipos-elemento-limpieza/", json={"nombre": "Escoba", "prefijo": "ESC"})
    return res.json()["id"]


def crear_elemento_auxiliar(frecuencia=10, nombre="Escoba cocina", tipo_id=None):
    if tipo_id is None:
        tipo_id = crear_tipo_auxiliar()
    res = client.post(
        "/elementos-limpieza/",
        json={"nombre": nombre, "tipo_id": tipo_id, "frecuencia_recambio_dias": frecuencia},
    )
    return res.json()["id"]


def hace(dias: int) -> str:
    return (date.today() - timedelta(days=dias)).isoformat()


# Regla de semaforización (función pura, sin base de datos)

def test_calcular_estado_vencido():
    hoy = date(2026, 1, 20)
    proxima, dias, estado = calcular_estado(date(2026, 1, 1), 10, hoy)
    assert proxima == date(2026, 1, 11)
    assert dias == -9
    assert estado == EstadoRecambio.VENCIDO


def test_calcular_estado_vence_hoy_es_proximo():
    hoy = date(2026, 1, 11)
    _, dias, estado = calcular_estado(date(2026, 1, 1), 10, hoy)
    assert dias == 0
    assert estado == EstadoRecambio.PROXIMO


def test_calcular_estado_limite_proximo():
    hoy = date(2026, 1, 11) - timedelta(days=Constantes.DIAS_AVISO_PROXIMO)
    _, _, estado = calcular_estado(date(2026, 1, 1), 10, hoy)
    assert estado == EstadoRecambio.PROXIMO


def test_calcular_estado_al_dia():
    hoy = date(2026, 1, 2)
    _, _, estado = calcular_estado(date(2026, 1, 1), 10, hoy)
    assert estado == EstadoRecambio.AL_DIA


# POST /recambios/

def test_registrar_recambio_sin_fecha_usa_hoy():
    elemento_id = crear_elemento_auxiliar()
    res = client.post("/recambios/", json={"elemento_id": elemento_id, "observaciones": "Cambio de rutina"})
    assert res.status_code == 201
    data = res.json()
    assert data["elemento_id"] == elemento_id
    assert data["fecha_recambio"].startswith(date.today().isoformat())
    assert data["observaciones"] == "Cambio de rutina"


def test_registrar_recambio_actualiza_elemento():
    elemento_id = crear_elemento_auxiliar()
    client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(5)})
    elemento = client.get(f"/elementos-limpieza/{elemento_id}").json()
    assert elemento["fecha_ultimo_recambio"].startswith(hace(5))


def test_registrar_recambio_elemento_inexistente():
    res = client.post("/recambios/", json={"elemento_id": 9999})
    assert res.status_code == 404


def test_registrar_recambio_elemento_inactivo():
    elemento_id = crear_elemento_auxiliar()
    client.delete(f"/elementos-limpieza/{elemento_id}")
    res = client.post("/recambios/", json={"elemento_id": elemento_id})
    assert res.status_code == 400


def test_registrar_recambio_sin_frecuencia():
    elemento_id = crear_elemento_auxiliar(frecuencia=None)
    res = client.post("/recambios/", json={"elemento_id": elemento_id})
    assert res.status_code == 400


def test_registrar_recambio_fecha_futura():
    elemento_id = crear_elemento_auxiliar()
    manana = (date.today() + timedelta(days=1)).isoformat()
    res = client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": manana})
    assert res.status_code == 400


def test_registrar_recambio_fecha_anterior_al_ultimo():
    elemento_id = crear_elemento_auxiliar()
    client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(2)})
    res = client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(5)})
    assert res.status_code == 409


def test_registrar_dos_recambios_mismo_dia():
    elemento_id = crear_elemento_auxiliar()
    client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(2)})
    res = client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(2)})
    assert res.status_code == 201


# GET /recambios/alertas

def test_alertas_estados_y_orden():
    tipo_id = crear_tipo_auxiliar()
    vencido = crear_elemento_auxiliar(nombre="Vencido", tipo_id=tipo_id)
    proximo = crear_elemento_auxiliar(nombre="Proximo", tipo_id=tipo_id)
    al_dia = crear_elemento_auxiliar(nombre="Al dia", tipo_id=tipo_id)
    client.post("/recambios/", json={"elemento_id": vencido, "fecha_recambio": hace(15)})
    client.post("/recambios/", json={"elemento_id": proximo, "fecha_recambio": hace(9)})
    client.post("/recambios/", json={"elemento_id": al_dia, "fecha_recambio": hace(1)})

    res = client.get("/recambios/alertas")
    assert res.status_code == 200
    data = res.json()
    assert [a["elemento"]["id"] for a in data] == [vencido, proximo, al_dia]
    assert [a["estado"] for a in data] == ["vencido", "proximo", "al_dia"]
    assert data[0]["dias_restantes"] == -5


def test_alertas_excluye_sin_frecuencia_e_inactivos():
    tipo_id = crear_tipo_auxiliar()
    crear_elemento_auxiliar(frecuencia=None, nombre="Sin frecuencia", tipo_id=tipo_id)
    inactivo = crear_elemento_auxiliar(nombre="Inactivo", tipo_id=tipo_id)
    client.delete(f"/elementos-limpieza/{inactivo}")

    res = client.get("/recambios/alertas")
    assert res.status_code == 200
    assert res.json() == []


# GET /recambios/?elemento_id=

def test_historial_ordenado_mas_reciente_primero():
    elemento_id = crear_elemento_auxiliar()
    client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(10)})
    client.post("/recambios/", json={"elemento_id": elemento_id, "fecha_recambio": hace(3)})

    res = client.get("/recambios/", params={"elemento_id": elemento_id})
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["fecha_recambio"].startswith(hace(3))
    assert data[1]["fecha_recambio"].startswith(hace(10))


def test_historial_solo_del_elemento_pedido():
    tipo_id = crear_tipo_auxiliar()
    uno = crear_elemento_auxiliar(nombre="Uno", tipo_id=tipo_id)
    otro = crear_elemento_auxiliar(nombre="Otro", tipo_id=tipo_id)
    client.post("/recambios/", json={"elemento_id": uno})
    client.post("/recambios/", json={"elemento_id": otro})

    data = client.get("/recambios/", params={"elemento_id": uno}).json()
    assert [r["elemento_id"] for r in data] == [uno]


def test_historial_vacio():
    elemento_id = crear_elemento_auxiliar()
    res = client.get("/recambios/", params={"elemento_id": elemento_id})
    assert res.status_code == 200
    assert res.json() == []


def test_historial_de_elemento_dado_de_baja():
    elemento_id = crear_elemento_auxiliar()
    client.post("/recambios/", json={"elemento_id": elemento_id})
    client.delete(f"/elementos-limpieza/{elemento_id}")
    res = client.get("/recambios/", params={"elemento_id": elemento_id})
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_historial_elemento_inexistente():
    res = client.get("/recambios/", params={"elemento_id": 9999})
    assert res.status_code == 404


def test_historial_sin_elemento_id():
    res = client.get("/recambios/")
    assert res.status_code == 422
