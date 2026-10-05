from datetime import datetime
from fastapi.testclient import TestClient
from src.main import app
from src.personal.models import Persona
from tests.database import session

cl = TestClient(app)

def crear_persona_auxiliar():
    persona = Persona(
        nombre="Auxiliar",
        apellido="Test",
        dni="12345678",
        legajo=12345,
    )
    session.add(persona)
    session.commit()
    return persona.id

def test_crear_incidente(session):
    reportante = crear_persona_auxiliar()

    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": reportante.id,
    }

    response = cl.post("/incidentes/", json=data)
    assert response.status_code == 201
    assert response.json()["titulo"] == data["titulo"]