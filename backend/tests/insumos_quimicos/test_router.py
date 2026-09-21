from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)


def crear_unidad_medida(nombre: str = "Kilogramo", simbolo: str = "kg", tipo: str = "masa") -> int:
    res = client.post(
        "/unidades-de-medida/",
        json={"nombre": nombre, "simbolo": simbolo, "tipo_magnitud": tipo},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]

def test_crear_insumo_quimico():
    unidad_id = crear_unidad_medida()
    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Algo"
    assert data["tipo"] == "otro"
    assert data["unidad_medida"]["nombre"] == "Kilogramo"
    assert data["activo"] is True
    assert "id" in data

def test_crear_insumo_quimico_duplicado_activo():
    cli = client
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )

    response = cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )

    assert response.status_code == 400

def test_crear_insumo_quimico_duplicado_inactivo():
    cli = client
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_q_id = res_post.json()["id"]
    res_del = cli.delete(f"/insumos-quimicos/{insumo_q_id}")
    assert res_del.status_code == 200

    response = cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["insumo_quimico_id"] == insumo_q_id
    assert "code" in data["detail"]
    assert response.headers.get("X-Insumo-Quimico-Id") == str(insumo_q_id)

def test_crear_insumo_quimico_tipo_invalido():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "papel",
            "unidad_medida_id": unidad_id,
        },
    )
    assert response.status_code == 422

def test_crear_insumo_quimico_con_unidad_inexistente():
    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": 25,
        },
    )
    assert response.status_code == 400
    