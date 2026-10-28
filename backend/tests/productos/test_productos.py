from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)

def test_crear_producto():
    # 1. Crear un producto exitosamente
    response = client.post(
        "/productos/",
        json={"nombre": "Levadura Fresca", "activo": True},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Levadura Fresca"
    assert data["activo"] is True
    assert "id" in data

def test_crear_producto_duplicado():
    # 1. Creamos el primero
    client.post("/productos/", json={"nombre": "Sal Marina", "activo": True})
    
    # 2. Intentamos crear el mismo de nuevo
    response = client.post(
        "/productos/",
        json={"nombre": "Sal Marina", "activo": True},
    )
    # Debe dar error 400 (Bad Request) o 409 (Conflict) dependiendo de cómo lo hayas configurado en tu services.py
    assert response.status_code in (400, 409)
    assert "detail" in response.json()

def test_listar_productos_activos():
    response = client.get("/productos/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)