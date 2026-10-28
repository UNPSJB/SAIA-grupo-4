from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)

def crear_producto_auxiliar() -> int:
    """Función de ayuda para crear un producto y obtener su ID antes de crear un lote."""
    response = client.post(
        "/productos/",
        json={"nombre": "Harina de Trigo 0000", "activo": True},
    )
    return response.json()["id"]

def test_crear_lote_exitoso():
    prod_id = crear_producto_auxiliar()
    
    response = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": "2026-10-26",
            "cantidad": 150.5
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["cantidad"] == 150.5
    assert data["producto_id"] == prod_id
    assert "id" in data

def test_crear_lote_cantidad_invalida():
    prod_id = crear_producto_auxiliar()
    
    # Intentamos crear un lote con cantidad 0 o negativa
    response = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": "2026-10-26",
            "cantidad": 0  
        },
    )
    assert response.status_code == 400
    assert "detail" in response.json()

def test_listar_lotes():
    response = client.get("/lotes/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)