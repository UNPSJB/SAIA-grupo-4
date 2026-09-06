from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)

def test_create_equipo():
    response = client.post(
        "/equipos/", 
        json={
            "nombre": "Heladera de prueba",
            "categoria": "heladera",
            "ubicacion": "Cocina"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Heladera de prueba"
    assert data["categoria"] == "heladera"
    assert data["ubicacion"] == "Cocina"
    assert "id" in data

def test_crear_equipo_duplicado():
    client.post(
        "/equipos/",
        json={"nombre": "Heladera duplicada", "categoria": "heladera", "ubicacion": "Cocina"}
    )
    
    response = client.post(
        "/equipos/",
        json={"nombre": "Heladera duplicada", "categoria": "heladera", "ubicacion": "Cocina"}
    )
    
    assert response.status_code == 400

def test_crear_equipo_categoria_invalida():
    response = client.post(
        "/equipos/",
        json={"nombre": "Camion", "categoria": "vehiculo"} 
    )
    assert response.status_code == 422

def test_listar_equipos():
    response = client.get("/equipos/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_obtener_equipo_por_id():
    res_post = client.post(
        "/equipos/", 
        json={"nombre": "Termómetro Digital", "categoria": "termometro"}
    )
    equipo_id = res_post.json()["id"]

    res_get = client.get(f"/equipos/{equipo_id}")
    assert res_get.status_code == 200
    assert res_get.json()["nombre"] == "Termómetro Digital"

def test_obtener_equipo_inexistente():
    response = client.get("/equipos/9999")
    assert response.status_code == 404

def test_actualizar_equipo():
    res_post = client.post(
        "/equipos/", 
        json={"nombre": "Balanza Vieja", "categoria": "balanza"}
    )
    equipo_id = res_post.json()["id"]

    res_put = client.put(
        f"/equipos/{equipo_id}", 
        json={"nombre": "Balanza Nueva", "ubicacion": "Depósito Central"}
    )
    assert res_put.status_code == 200
    assert res_put.json()["nombre"] == "Balanza Nueva"
    assert res_put.json()["ubicacion"] == "Depósito Central"

def test_eliminar_equipo():
    res_post = client.post(
        "/equipos/", 
        json={"nombre": "Horno a eliminar", "categoria": "horno"}
    )
    equipo_id = res_post.json()["id"]

    res_del = client.delete(f"/equipos/{equipo_id}")
    assert res_del.status_code == 200

    res_get = client.get(f"/equipos/{equipo_id}")
    assert res_get.status_code == 404