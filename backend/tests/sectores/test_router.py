from fastapi.testclient import TestClient
from src.main import app
from tests.database import session
import uuid

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

def test_crear_sector():
    nombre = generar_string_unico("Sector")
    response = client.post("/sectores/", json={"nombre": nombre})
    
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == nombre
    assert data["activo"] is True
    assert "id" in data

def test_crear_sector_duplicado_activo():
    nombre = generar_string_unico("SectorDup")
    payload = {"nombre": nombre}
    
    client.post("/sectores/", json=payload)
    
    response = client.post("/sectores/", json=payload)
    assert response.status_code == 409
    assert "El sector ya existe." in response.json()["detail"]

def test_crear_sector_requiere_reactivacion():
    nombre = generar_string_unico("SectorInactivo")
    payload = {"nombre": nombre}
    
    # 1. Se crea el sector
    res_post = client.post("/sectores/", json=payload)
    sector_id = res_post.json()["id"]
    
    # 2. Se le da de baja
    client.delete(f"/sectores/{sector_id}")
    
    # 3. Se intenta crear el mismo
    res_conflicto = client.post("/sectores/", json=payload)
    
    assert res_conflicto.status_code == 409
    detail = res_conflicto.json()["detail"]
    assert "sector_id" in detail
    assert detail["sector_id"] == sector_id

def test_listar_sectores():
    response = client.get("/sectores/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_obtener_sector_por_id():
    nombre = generar_string_unico("SectorGet")
    res_post = client.post("/sectores/", json={"nombre": nombre})
    sector_id = res_post.json()["id"]

    res_get = client.get(f"/sectores/{sector_id}")
    assert res_get.status_code == 200
    assert res_get.json()["nombre"] == nombre

def test_actualizar_sector_activo():
    res_post = client.post("/sectores/", json={"nombre": generar_string_unico("Viejo")})
    sector_id = res_post.json()["id"]

    nombre_nuevo = generar_string_unico("Nuevo")
    res_put = client.put(f"/sectores/{sector_id}", json={"nombre": nombre_nuevo})
    
    assert res_put.status_code == 200
    assert res_put.json()["nombre"] == nombre_nuevo

def test_bloquear_baja_por_put():
    res_post = client.post("/sectores/", json={"nombre": generar_string_unico("BloqueoBaja")})
    sector_id = res_post.json()["id"]

    res_put = client.put(f"/sectores/{sector_id}", json={"activo": False})
    assert res_put.status_code == 400

def test_eliminar_sector_sin_equipos():
    res_post = client.post("/sectores/", json={"nombre": generar_string_unico("A_Eliminar")})
    sector_id = res_post.json()["id"]

    res_del = client.delete(f"/sectores/{sector_id}")
    assert res_del.status_code == 200
    assert res_del.json()["activo"] is False

def test_eliminar_sector_con_equipos_activos():
    # 1. Se crea el sector
    res_sector = client.post("/sectores/", json={"nombre": generar_string_unico("SectorOcupado")})
    sector_id = res_sector.json()["id"]
    
    # 2. Se le mete un equipo adentro
    client.post(
        "/equipos/", 
        json={
            "nombre": "Horno Test",
            "marca": "TestMarca",
            "numero_serie": generar_string_unico("SN"),
            "categoria": "horno",
            "sector_id": sector_id
        }
    )
    
    # 3. Se intenta borrar el sector (Debe fallar)
    res_del = client.delete(f"/sectores/{sector_id}")
    assert res_del.status_code == 409

def test_reactivar_sector():
    res_post = client.post("/sectores/", json={"nombre": generar_string_unico("Reactivar")})
    sector_id = res_post.json()["id"]

    client.delete(f"/sectores/{sector_id}")
    
    res_put = client.put(f"/sectores/{sector_id}", json={"activo": True})
    assert res_put.status_code == 200
    assert res_put.json()["activo"] is True