from fastapi.testclient import TestClient
from src.auth.dependencies import get_current_user
from src.main import app
from tests.database import session
import uuid

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
    assert client.delete(f"/lotes-insumo/{inactivo['id']}").status_code == 200

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


# --- Baja lógica ---

def test_eliminar_lote_es_baja_logica():
    lote = crear_lote(crear_insumo()["id"])

    res_del = client.delete(f"/lotes-insumo/{lote['id']}")
    assert res_del.status_code == 200
    assert res_del.json()["activo"] is False

    # El registro sigue existiendo, solo quedó inactivo
    res_get = client.get(f"/lotes-insumo/{lote['id']}")
    assert res_get.status_code == 200
    assert res_get.json()["activo"] is False


def test_eliminar_lote_ya_dado_de_baja():
    lote = crear_lote(crear_insumo()["id"])
    assert client.delete(f"/lotes-insumo/{lote['id']}").status_code == 200

    response = client.delete(f"/lotes-insumo/{lote['id']}")
    assert response.status_code == 400


def test_eliminar_lote_inexistente():
    response = client.delete("/lotes-insumo/9999")
    assert response.status_code == 404


# --- Permisos ---

def test_endpoints_sin_sesion_responden_401():
    # Quitamos el override de administrador que pone tests/database.py
    app.dependency_overrides.pop(get_current_user, None)

    assert client.get("/lotes-insumo/").status_code == 401
    assert client.post(
        "/lotes-insumo/",
        json={"insumo_id": 1, "codigo_lote": "L-001", "fecha_vencimiento": "2027-03-15"},
    ).status_code == 401