from fastapi.testclient import TestClient
from src.auth.dependencies import get_current_user
from src.main import app
from tests.database import session
import uuid
from datetime import datetime


client = TestClient(app)


# --- Helpers ---

def sufijo_unico():
    return uuid.uuid4().hex[:8]


def crear_unidad_medida(nombre: str = "Kilogramo", simbolo: str = "kg", tipo: str = "masa") -> int:
    res = client.post(
        "/unidades-de-medida/",
        json={"nombre": nombre, "simbolo": simbolo, "tipo_magnitud": tipo},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def crear_insumo(nombre: str | None = None, unidad_id: int | None = None) -> dict:
    res = client.post(
        "/insumos/",
        json={
            "nombre": nombre or f"Harina {sufijo_unico()}",
            "unidad_medida_id": unidad_id or crear_unidad_medida(),
            "categoria": "materia prima",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def crear_lote(insumo_id: int, codigo: str = "L-001", fecha: str = "2027-01-31") -> dict:
    res = client.post(
        "/lotes-insumo/",
        json={"insumo_id": insumo_id, "codigo_lote": codigo, "fecha_vencimiento": fecha},
    )
    assert res.status_code == 201, res.text
    return res.json()


def ids_listados(**params):
    res = client.get("/lotes-insumo/", params=params)
    assert res.status_code == 200, res.text
    return {lote["id"] for lote in res.json()}


def inhabilitar_lote(lote_id: int, motivo: str = "Contaminación detectada en control de calidad"):
    return client.patch(f"/lotes-insumo/{lote_id}/inhabilitar", json={"motivo": motivo})


# --- Crear ---

def test_crear_lote_insumo():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-2026-001",
            "fecha_vencimiento": "2027-03-15",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["insumo_id"] == insumo["id"]
    assert data["codigo_lote"] == "L-2026-001"
    assert data["fecha_vencimiento"] == "2027-03-15"
    assert data["activo"] is True
    assert "id" in data


def test_crear_lote_queda_activo_aunque_se_envie_inactivo():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-ACT",
            "fecha_vencimiento": "2027-03-15",
            "activo": False,
        },
    )
    assert response.status_code == 201
    assert response.json()["activo"] is True


def test_crear_lote_sin_codigo():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={"insumo_id": insumo["id"], "fecha_vencimiento": "2027-03-15"},
    )
    assert response.status_code == 422


def test_crear_lote_sin_fecha_vencimiento():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={"insumo_id": insumo["id"], "codigo_lote": "L-001"},
    )
    assert response.status_code == 422


def test_crear_lote_codigo_vacio_o_en_blanco():
    insumo = crear_insumo()
    for codigo in ["", "   "]:
        response = client.post(
            "/lotes-insumo/",
            json={
                "insumo_id": insumo["id"],
                "codigo_lote": codigo,
                "fecha_vencimiento": "2027-03-15",
            },
        )
        assert response.status_code == 422


def test_crear_lote_fecha_invalida():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-001",
            "fecha_vencimiento": "no-es-una-fecha",
        },
    )
    assert response.status_code == 422


def test_crear_lote_insumo_inexistente():
    response = client.post(
        "/lotes-insumo/",
        json={"insumo_id": 9999, "codigo_lote": "L-001", "fecha_vencimiento": "2027-03-15"},
    )
    assert response.status_code == 404


def test_crear_lote_insumo_dado_de_baja():
    insumo = crear_insumo()
    assert client.delete(f"/insumos/{insumo['id']}").status_code == 200

    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-001",
            "fecha_vencimiento": "2027-03-15",
        },
    )
    assert response.status_code == 400


def test_lote_no_gestiona_cantidades_ni_stock():
    lote = crear_lote(crear_insumo()["id"])
    for campo in ["cantidad", "stock", "saldo"]:
        assert campo not in lote


# --- Leer y listar ---

def test_leer_lote_por_id():
    insumo = crear_insumo()
    lote = crear_lote(insumo["id"], codigo="L-LEER")

    response = client.get(f"/lotes-insumo/{lote['id']}")
    assert response.status_code == 200
    assert response.json()["codigo_lote"] == "L-LEER"
    assert response.json()["insumo_id"] == insumo["id"]


def test_leer_lote_inexistente():
    response = client.get("/lotes-insumo/9999")
    assert response.status_code == 404


def test_listar_lotes():
    response = client.get("/lotes-insumo/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listar_lotes_filtrando_por_insumo():
    unidad_id = crear_unidad_medida()
    insumo_a = crear_insumo(unidad_id=unidad_id)
    insumo_b = crear_insumo(unidad_id=unidad_id)
    lote_a = crear_lote(insumo_a["id"], codigo="L-A")
    lote_b = crear_lote(insumo_b["id"], codigo="L-B")

    assert ids_listados(insumo_id=insumo_a["id"]) == {lote_a["id"]}
    assert ids_listados(insumo_id=insumo_b["id"]) == {lote_b["id"]}


def test_listar_lotes_filtrando_por_activo():
    insumo = crear_insumo()
    activo = crear_lote(insumo["id"], codigo="L-ACTIVO")
    inactivo = crear_lote(insumo["id"], codigo="L-INACTIVO")
    assert inhabilitar_lote(inactivo["id"]).status_code == 200
    assert ids_listados(insumo_id=insumo["id"], activo="true") == {activo["id"]}
    assert ids_listados(insumo_id=insumo["id"], activo="false") == {inactivo["id"]}
    assert ids_listados(insumo_id=insumo["id"]) == {activo["id"], inactivo["id"]}


# --- Modificar ---

def test_modificar_lote_codigo_y_fecha():
    lote = crear_lote(crear_insumo()["id"])

    response = client.put(
        f"/lotes-insumo/{lote['id']}",
        json={"codigo_lote": "L-NUEVO", "fecha_vencimiento": "2028-05-10"},
    )
    assert response.status_code == 200
    assert response.json()["codigo_lote"] == "L-NUEVO"
    assert response.json()["fecha_vencimiento"] == "2028-05-10"


def test_modificar_lote_parcial_no_pisa_el_resto():
    lote = crear_lote(crear_insumo()["id"], codigo="L-ORIGINAL", fecha="2027-01-31")

    response = client.put(
        f"/lotes-insumo/{lote['id']}",
        json={"fecha_vencimiento": "2028-05-10"},
    )
    assert response.status_code == 200
    assert response.json()["codigo_lote"] == "L-ORIGINAL"
    assert response.json()["fecha_vencimiento"] == "2028-05-10"


def test_modificar_lote_codigo_vacio():
    lote = crear_lote(crear_insumo()["id"])

    response = client.put(f"/lotes-insumo/{lote['id']}", json={"codigo_lote": "   "})
    assert response.status_code == 422


def test_modificar_lote_inexistente():
    response = client.put("/lotes-insumo/9999", json={"codigo_lote": "L-X"})
    assert response.status_code == 404


# --- Permisos ---

def test_endpoints_sin_sesion_responden_401():
    # Quitamos el override de administrador que pone tests/database.py
    app.dependency_overrides.pop(get_current_user, None)

    assert client.get("/lotes-insumo/").status_code == 401
    assert client.patch(
        "/lotes-insumo/1/inhabilitar", json={"motivo": "Contaminación detectada"}
    ).status_code == 401

def test_inhabilitar_lote():
    lote = crear_lote(crear_insumo()["id"])

    response = inhabilitar_lote(lote["id"], "Contaminación detectada en control de calidad")
    assert response.status_code == 200
    data = response.json()
    assert data["activo"] is False
    assert data["motivo_inhabilitacion"] == "Contaminación detectada en control de calidad"
    assert data["fecha_inhabilitacion"] is not None
    assert isinstance(data["usuario_inhabilitacion_id"], int)


def test_inhabilitar_lote_registra_fecha_y_hora_actual():
    lote = crear_lote(crear_insumo()["id"])

    data = inhabilitar_lote(lote["id"]).json()
    fecha = datetime.fromisoformat(data["fecha_inhabilitacion"])
    assert abs((datetime.now() - fecha).total_seconds()) < 60


def test_inhabilitar_lote_no_lo_borra_y_queda_en_el_detalle():
    lote = crear_lote(crear_insumo()["id"])
    inhabilitar_lote(lote["id"], "Lote con fallas de calidad")

    response = client.get(f"/lotes-insumo/{lote['id']}")
    assert response.status_code == 200
    assert response.json()["activo"] is False
    assert response.json()["motivo_inhabilitacion"] == "Lote con fallas de calidad"


def test_inhabilitar_lote_sin_motivo():
    lote = crear_lote(crear_insumo()["id"])

    response = client.patch(f"/lotes-insumo/{lote['id']}/inhabilitar", json={})
    assert response.status_code == 422
    # El lote sigue activo
    assert client.get(f"/lotes-insumo/{lote['id']}").json()["activo"] is True


def test_inhabilitar_lote_motivo_muy_corto_o_en_blanco():
    lote = crear_lote(crear_insumo()["id"])

    for motivo in ["", "corto", " " * 10]:
        assert inhabilitar_lote(lote["id"], motivo).status_code == 422

    assert client.get(f"/lotes-insumo/{lote['id']}").json()["activo"] is True


def test_inhabilitar_lote_inexistente():
    assert inhabilitar_lote(9999).status_code == 404


def test_inhabilitar_lote_ya_inhabilitado():
    lote = crear_lote(crear_insumo()["id"])
    assert inhabilitar_lote(lote["id"]).status_code == 200

    response = inhabilitar_lote(lote["id"], "Segundo intento de inhabilitación")
    assert response.status_code == 400
    # No se pisa el motivo original
    detalle = client.get(f"/lotes-insumo/{lote['id']}").json()
    assert detalle["motivo_inhabilitacion"] == "Contaminación detectada en control de calidad"


def test_lote_inhabilitado_no_aparece_entre_los_activos():
    insumo = crear_insumo()
    lote = crear_lote(insumo["id"])
    inhabilitar_lote(lote["id"])

    assert lote["id"] not in ids_listados(insumo_id=insumo["id"], activo="true")


def test_modificar_lote_inhabilitado():
    lote = crear_lote(crear_insumo()["id"])
    inhabilitar_lote(lote["id"])

    response = client.put(f"/lotes-insumo/{lote['id']}", json={"codigo_lote": "L-NUEVO"})
    assert response.status_code == 400


def test_crear_lote_ignora_campos_de_inhabilitacion():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-AUD",
            "fecha_vencimiento": "2027-03-15",
            "motivo_inhabilitacion": "inventado",
            "usuario_inhabilitacion_id": 1,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["motivo_inhabilitacion"] is None
    assert data["fecha_inhabilitacion"] is None
    assert data["usuario_inhabilitacion_id"] is None