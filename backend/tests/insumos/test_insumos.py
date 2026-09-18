from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)

def test_crear_insumo():
    response = client.post(
        "/insumos/",
        json={
            "nombre": "Harina 0000",
            "unidad_medida": "kilogramos",
            "categoria": "materia prima",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nombre"] == "Harina 0000"
    assert data["unidad_medida"] == "kilogramos"
    assert data["categoria"] == "materia prima"
    assert data["disponible"] is True
    assert "id" in data

def test_crear_insumo_duplicado_activo():
    cliente = client
    cliente.post(
        "/insumos/",
        json={
            "nombre": "Levadura",
            "unidad_medida": "gramos",
            "categoria": "materia prima",
        },
    )

    response = cliente.post(
        "/insumos/",
        json={
            "nombre": "Levadura",
            "unidad_medida": "gramos",
            "categoria": "materia prima",
        },
    )

    assert response.status_code == 400

def test_crear_insumo_duplicado_inactivo():
    # Creamos un insumo y lo damos de baja (baja logica)
    cliente = client
    res_post = cliente.post(
        "/insumos/",
        json={
            "nombre": "Azúcar",
            "unidad_medida": "kilogramos",
            "categoria": "materia prima",
        },
    )
    insumo_id = res_post.json()["id"]
    res_del = cliente.delete(f"/insumos/{insumo_id}")
    assert res_del.status_code == 200

    # Intentamos crear otro insumo con el mismo nombre
    response = cliente.post(
        "/insumos/",
        json={
            "nombre": "Azúcar",
            "unidad_medida": "kilogramos",
            "categoria": "materia prima",
        },
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["insumo_id"] == insumo_id
    assert "code" in data["detail"]
    assert response.headers.get("X-Insumo-Id") == str(insumo_id)

def test_crear_insumo_categoria_invalida():
    response = client.post(
        "/insumos/",
        json={"nombre": "Sal", "unidad_medida": "gramos", "categoria": "vehiculo"},
    )
    assert response.status_code == 422

def test_listar_insumos():
    response = client.get("/insumos/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_obtener_insumo_por_id():
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Aceite",
            "unidad_medida": "litros",
            "categoria": "aditivo",
        },
    )
    insumo_id = res_post.json()["id"]

    res_get = client.post(f"/insumos/{insumo_id}")
    assert res_get.status_code == 200
    assert res_get.json()["nombre"] == "Aceite"

def test_obtener_insumo_inexistente():
    response = client.post("/insumos/9999")
    assert response.status_code == 404

def test_actualizar_insumo():
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Envase 500ml",
            "unidad_medida": "unidades",
            "categoria": "envase",
        },
    )
    insumo_id = res_post.json()["id"]

    res_put = client.put(
        f"/insumos/{insumo_id}",
        json={"nombre": "Envase 1L", "unidad_medida": "unidades"},
    )
    assert res_put.status_code == 200
    assert res_put.json()["nombre"] == "Envase 1L"

def test_eliminar_insumo():
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Caja de cartón",
            "unidad_medida": "unidades",
            "categoria": "envase",
        },
    )
    insumo_id = res_post.json()["id"]

    res_del = client.delete(f"/insumos/{insumo_id}")
    assert res_del.status_code == 200
    assert res_del.json()["disponible"] is False