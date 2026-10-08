from datetime import datetime
from fastapi.testclient import TestClient
from src.main import app
from src.personal.models import Persona
from tests.database import session

cl = TestClient(app)

def crear_capacidad_auxiliar():
    # Se crea una capacidad auxiliar para usarla en los tests
    data = {
        "nombre": "Capacidad Test",
        "descripcion": "Descripción de la capacidad de prueba"
    }
    res = cl.post("/capacidades/", json=data)
    return res.json()["id"]

def crear_persona_auxiliar():
    # Se crea una persona auxiliar para usarla como reportante en los tests
    persona = {
        "nombre": "Auxiliar",
        "apellido": "Test",
        "dni": "12345678",
        "legajo": 12345,
        "capacidades_ids": [crear_capacidad_auxiliar()]
    }
    res = cl.post("/personal/", json=persona)
    return res.json()["id"]

def crear_tipo_incidente_auxiliar():
    # Se crea un tipo de incidente auxiliar para usarlo en los tests
    data = {
        "nombre": "Tipo Test",
        "descripcion": "Descripcion de tipo de prueba"
    }
    res = cl.post("/tipos-incidente/", json=data)
    return res.json()["id"]

def test_crear_incidente(session):
    # Se crea un incidente valido
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }

    response = cl.post("/incidentes/", json=data)
    assert response.status_code == 201
    assert response.json()["titulo"] == data["titulo"]

def test_crear_incidente_con_reportante_inexistente(session):
    # Se intenta crear un incidente con un reportante que no existe
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": 9999, # ID de persona que no existe
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }

    response = cl.post("/incidentes/", json=data)
    assert response.status_code == 404
    assert response.json()["detail"] == "El reportante no fue encontrado."

def test_crear_incidente_sin_reportante(session):
    # Se intenta crear un incidente sin asignar un reportante
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": None, # No se asigna reportante
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }

    response = cl.post("/incidentes/", json=data)
    assert response.status_code == 422

def test_listar_incidentes(session):
    # Se crea un incidente para listar
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }
    cl.post("/incidentes/", json=data)

    # Se listan los incidentes
    response = cl.get("/incidentes/")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_crear_incidente_sin_tipo(session):
    # Se intenta crear un incidente sin tipo
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": None # No se asigna un tipo
    }
    res = cl.post("/incidentes/", json=data)

    assert res.status_code == 422

def test_crear_incidente_con_tipo_inexistente(session):
    # Se intenta crear un incidente con un tipo que no existe
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": 9999 # ID de tipo inexistente
    }
    res = cl.post("/incidentes/", json=data)

    assert res.status_code == 404
    assert res.json()["detail"] == "El tipo de incidente no fue encontrado."

def test_crear_incidente_con_tipo_inactivo(session):
    # Se intenta crear un incidente con tipo inactivo

    # 1. Creo un tipo
    tipo_id = crear_tipo_incidente_auxiliar()

    # 2. desactivo el tipo
    res_del = cl.delete(f"/tipos-incidente/{tipo_id}")
    assert res_del.status_code == 200

    # 3. Armo los datos del incidente
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": tipo_id, # ID del tipo inactivo
    }

    # 4. Intento crear el incidente
    res = cl.post("/incidentes/", json=data)

    # 5. Confirmo que rechaza la operacion
    assert res.status_code == 400
    assert res.json()["detail"] == "El tipo de incidente se encuentra inactivo."

def test_consultar_incidente(session):
    # Se consulta un incidente para ver los datos

    # 1. Armo los datos del incidente
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(), 
    }

    # 2. Creo el incidente
    res_post = cl.post("/incidentes/", json=data)
    incidente_id = res_post.json()["id"]

    # 3. Confirmo que se crea
    assert res_post.status_code == 201

    # 4. Leo el incidente
    res = cl.get(f"/incidentes/{incidente_id}")
    assert res.status_code == 200

    # 5. Veo los datos que tiene
    incidente = res.json()
    assert incidente["id"] == incidente_id
    assert incidente["titulo"] == data["titulo"]
    assert incidente["descripcion"] == data["descripcion"]
    assert incidente["fecha_hora_reporte"] == data["fecha_hora_reporte"]
    assert incidente["reportante_id"] == data["reportante_id"]
    assert incidente["reportante"]["id"] == data["reportante_id"]
    assert incidente["tipo_id"] == data["tipo_id"]
    assert incidente["tipo"]["id"] == data["tipo_id"]
    assert incidente["abierto"] is True