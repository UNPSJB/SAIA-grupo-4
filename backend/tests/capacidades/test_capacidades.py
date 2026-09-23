import random

from fastapi.testclient import TestClient
from src.main import app
from tests.database import session
import uuid

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

def test_crear_capacidad():
    nombre_cap = generar_string_unico("Cap")
    response = client.post("/capacidades/", json={"nombre": nombre_cap, "descripcion": "Prueba"})
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == nombre_cap
    assert data["activo"] is True
    assert "id" in data

def test_crear_capacidad_duplicada():
    nombre_cap = generar_string_unico("CapDup")
    payload = {"nombre": nombre_cap}
    
    client.post("/capacidades/", json=payload)
    response = client.post("/capacidades/", json=payload)
    
    assert response.status_code == 409
    assert response.json()["detail"] == "Ya existe una capacidad con ese nombre."

def test_crear_capacidad_requiere_reactivacion():
    nombre_cap = generar_string_unico("CapInactiva")
    payload = {"nombre": nombre_cap}
    
    res_post = client.post("/capacidades/", json=payload)
    cap_id = res_post.json()["id"]
    
    client.delete(f"/capacidades/{cap_id}")
    
    res_conflicto = client.post("/capacidades/", json=payload)
    assert res_conflicto.status_code == 409
    detail = res_conflicto.json()["detail"]
    assert detail["code"] == "La capacidad ya existe pero está inactiva."
    assert detail["capacidad_id"] == cap_id

def test_actualizar_capacidad():
    nombre_cap = generar_string_unico("CapUpdate")
    res_post = client.post("/capacidades/", json={"nombre": nombre_cap})
    cap_id = res_post.json()["id"]

    res_put = client.put(f"/capacidades/{cap_id}", json={"descripcion": "Nueva descripcion"})
    assert res_put.status_code == 200
    assert res_put.json()["descripcion"] == "Nueva descripcion"

def test_bloquear_baja_por_put_capacidad():
    nombre_cap = generar_string_unico("CapPut")
    res_post = client.post("/capacidades/", json={"nombre": nombre_cap})
    cap_id = res_post.json()["id"]

    res_put = client.put(f"/capacidades/{cap_id}", json={"activo": False})
    assert res_put.status_code == 400
    assert res_put.json()["detail"] == "La baja de la capacidad debe realizarse mediante el endpoint de eliminación."

def test_eliminar_capacidad():
    nombre_cap = generar_string_unico("CapDel")
    res_post = client.post("/capacidades/", json={"nombre": nombre_cap})
    cap_id = res_post.json()["id"]

    res_del = client.delete(f"/capacidades/{cap_id}")
    assert res_del.status_code == 200
    assert res_del.json()["activo"] is False
    
def test_eliminar_capacidad_en_uso():
    # Se crea una nueva capacidad
    nombre_cap = generar_string_unico("CapEnUso")
    res_cap = client.post("/capacidades/", json={"nombre": nombre_cap})
    cap_id = res_cap.json()["id"]

    # Se crea una persona activa y se le asigna esa capacidad
    dni = str(random.randint(10000000, 99999999))
    legajo = random.randint(10000, 99999)
    client.post("/personal/", json={
        "nombre": "Usuario",
        "apellido": "Test",
        "dni": dni,
        "legajo": legajo,
        "capacidades_ids": [cap_id]
    })

    # Se intenta dar de baja la capacidad mientras la persona sigue activa
    res_del = client.delete(f"/capacidades/{cap_id}")

    # Se valida que el backend frene con un 409 Conflict y el mensaje exacto
    assert res_del.status_code == 409
    assert res_del.json()["detail"] == "No se puede dar de baja porque hay personal activo con esta capacidad."