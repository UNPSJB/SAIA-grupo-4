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

def test_filtrar_lotes_por_producto_y_fechas():
    # Creamos dos productos distintos (con nombres únicos por si corre varias veces)
    res_p1 = client.post("/productos/", json={"nombre": "Producto Filtro A"})
    res_p2 = client.post("/productos/", json={"nombre": "Producto Filtro B"})
    prod1_id = res_p1.json()["id"]
    prod2_id = res_p2.json()["id"]

    # Creamos lotes en distintas fechas
    client.post(
        "/lotes/",
        json={"producto_id": prod1_id, "fecha": "2026-10-01", "cantidad": 50},
    )
    client.post(
        "/lotes/",
        json={"producto_id": prod2_id, "fecha": "2026-10-15", "cantidad": 120},
    )

    # 1. Filtrar por producto_id
    res_prod = client.get(f"/lotes/?producto_id={prod1_id}")
    assert res_prod.status_code == 200
    datos_prod = res_prod.json()
    assert len(datos_prod) >= 1
    assert all(l["producto_id"] == prod1_id for l in datos_prod)

    # 2. Filtrar por rango de fechas (desde / hasta)
    res_fechas = client.get("/lotes/?desde=2026-10-10&hasta=2026-10-20")
    assert res_fechas.status_code == 200
    datos_fechas = res_fechas.json()
    assert any(l["producto_id"] == prod2_id for l in datos_fechas)
    assert all("2026-10-10" <= l["fecha"] <= "2026-10-20" for l in datos_fechas)
def test_obtener_estadisticas_produccion():
    # 1. Crear productos
    p1 = client.post("/productos/", json={"nombre": "Producto Stat A"}).json()["id"]
    p2 = client.post("/productos/", json={"nombre": "Producto Stat B"}).json()["id"]
    
    # 2. Crear lotes (Producto A = 30 en total, Producto B = 15 en total)
    client.post("/lotes/", json={"producto_id": p1, "fecha": "2026-11-01", "cantidad": 10})
    client.post("/lotes/", json={"producto_id": p1, "fecha": "2026-11-02", "cantidad": 20})
    client.post("/lotes/", json={"producto_id": p2, "fecha": "2026-11-01", "cantidad": 15})
    
    # 3. Probar endpoint general sin filtros
    res = client.get("/lotes/estadisticas")
    assert res.status_code == 200
    data = res.json()
    
    stat_p1 = next((item for item in data if item["producto_id"] == p1), None)
    stat_p2 = next((item for item in data if item["producto_id"] == p2), None)
    
    assert stat_p1 is not None
    assert stat_p1["cantidad_total"] == 30.0
    assert stat_p2 is not None
    assert stat_p2["cantidad_total"] == 15.0
    
    # 4. Probar endpoint con filtro de fechas
    res_fechas = client.get("/lotes/estadisticas?desde=2026-11-02&hasta=2026-11-05")
    data_fechas = res_fechas.json()
    stat_p1_fechas = next((item for item in data_fechas if item["producto_id"] == p1), None)
    
    # Solo debería contar el lote del 11-02 (cantidad 20)
    assert stat_p1_fechas["cantidad_total"] == 20.0