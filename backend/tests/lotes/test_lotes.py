from datetime import date
from fastapi.testclient import TestClient
from src.main import app
from tests.database import session, TestingSessionLocal  
from src.productos.models import Producto
from src.insumos.models import Insumo
from src.unidad_medida.models import UnidadMedida

client = TestClient(app)

def crear_datos_prueba(nombre_prod: str = "Pan Test", nombre_insumo: str = "Harina Test"):
    """Crea producto, unidad de medida e insumo directamente en la DB de prueba."""
    db = TestingSessionLocal()
    try:
        prod = Producto(nombre=nombre_prod, activo=True)
        db.add(prod)

        unidad = UnidadMedida(
            nombre="Kilogramo",
            simbolo="kg",
            tipo_magnitud="masa",
            disponible=True
        )
        db.add(unidad)
        db.flush()

        # 3. Insumo
        insumo = Insumo(
            nombre=nombre_insumo,
            unidad_medida_id=unidad.id,
            categoria="materia prima",
            descripcion="Insumo para pruebas",
            disponible=True
        )
        db.add(insumo)
        db.commit()
        db.refresh(prod)
        db.refresh(insumo)
        return prod.id, insumo.id
    finally:
        db.close()

# tests de creación y listado de lotes

def test_crear_lote_exitoso():
    prod_id, _ = crear_datos_prueba("Pan Francés", "Levadura Fresca")
    response = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": str(date.today()),
            "cantidad": 50.0
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["producto_id"] == prod_id
    assert data["cantidad"] == 50.0
    assert "insumos_asociados" in data

def test_crear_lote_cantidad_invalida():
    prod_id, _ = crear_datos_prueba("Galletas", "Manteca")
    response = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": str(date.today()),
            "cantidad": 0
        },
    )
    assert response.status_code in [400, 422]

def test_listar_lotes():
    prod_id, _ = crear_datos_prueba("Medialunas", "Azúcar Blanca")
    client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": str(date.today()),
            "cantidad": 20.0
        },
    )
    response = client.get("/lotes/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) > 0

# tests de asociación de insumos a lotes

def test_asociar_insumos_a_lote_exitoso():
    prod_id, insumo_id = crear_datos_prueba("Pan de Molde", "Harina 000")
    res_lote = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": str(date.today()),
            "cantidad": 100.0
        },
    )
    lote_id = res_lote.json()["id"]

    payload = {
        "insumos": [
            {"insumo_id": insumo_id, "cantidad": 25.5}
        ]
    }
    response = client.post(f"/lotes/{lote_id}/insumos", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["insumos_asociados"]) == 1
    assert data["insumos_asociados"][0]["insumo_id"] == insumo_id
    assert data["insumos_asociados"][0]["cantidad"] == 25.5

def test_asociar_insumos_duplicados_falla():
    prod_id, insumo_id = crear_datos_prueba("Bizcochuelo Vainilla", "Polvo de Hornear")
    res_lote = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": str(date.today()),
            "cantidad": 30.0
        },
    )
    lote_id = res_lote.json()["id"]

    payload = {
        "insumos": [
            {"insumo_id": insumo_id, "cantidad": 5.0},
            {"insumo_id": insumo_id, "cantidad": 10.0}
        ]
    }
    response = client.post(f"/lotes/{lote_id}/insumos", json=payload)
    assert response.status_code == 400
    assert "No se puede repetir" in response.json()["detail"]

def test_asociar_insumos_cantidad_invalida():
    prod_id, _ = crear_datos_prueba("Tarta", "Manzana")
    res_lote = client.post(
        "/lotes/",
        json={
            "producto_id": prod_id,
            "fecha": str(date.today()),
            "cantidad": 15.0
        },
    )
    lote_id = res_lote.json()["id"]

    payload = {
        "insumos": [
            {"insumo_id": 1, "cantidad": 0}
        ]
    }
    response = client.post(f"/lotes/{lote_id}/insumos", json=payload)
    assert response.status_code in [400, 422]