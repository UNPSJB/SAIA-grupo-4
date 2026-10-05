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

def test_crear_incidente(session):
    # Se crea un incidente valido
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
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
    }
    cl.post("/incidentes/", json=data)

    # Se listan los incidentes
    response = cl.get("/incidentes/")
    assert response.status_code == 200
    assert len(response.json()) > 0