from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)

LIBRETA = {"nombre": "Libreta sanitaria", "vigencia_dias": 365}


def crear(payload=LIBRETA) -> dict:
    response = client.post("/documentos-personal/", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_crear_documento():
    data = crear()
    assert data["nombre"] == "Libreta sanitaria"
    assert data["vigencia_dias"] == 365
    assert data["activo"] is True
    assert client.get(f"/documentos-personal/{data['id']}").json() == data
    assert client.get("/documentos-personal/").json() == [data]


def test_crear_documento_duplicado():
    crear()
    response = client.post("/documentos-personal/", json=LIBRETA)
    assert response.status_code == 409
    assert response.json()["detail"] == "Ya existe un documento de personal con ese nombre."


def test_vigencia_debe_ser_positiva():
    response = client.post("/documentos-personal/", json={"nombre": "Carnet", "vigencia_dias": 0})
    assert response.status_code == 422


def test_leer_documento_inexistente():
    assert client.get("/documentos-personal/999").status_code == 404


def test_modificar_documento():
    doc_id = crear()["id"]
    response = client.put(f"/documentos-personal/{doc_id}", json={"vigencia_dias": 180})
    assert response.status_code == 200
    assert response.json()["vigencia_dias"] == 180
    assert response.json()["nombre"] == "Libreta sanitaria"


def test_modificar_a_nombre_duplicado():
    crear()
    otro_id = crear({"nombre": "Carnet de manipulador", "vigencia_dias": 730})["id"]
    response = client.put(f"/documentos-personal/{otro_id}", json={"nombre": "Libreta sanitaria"})
    assert response.status_code == 409


def test_baja_y_reactivacion():
    doc_id = crear()["id"]
    response = client.delete(f"/documentos-personal/{doc_id}")
    assert response.status_code == 200
    assert response.json()["activo"] is False

    # Crear con el mismo nombre avisa que existe inactivo y devuelve su id
    response = client.post("/documentos-personal/", json=LIBRETA)
    assert response.status_code == 409
    assert response.json()["detail"]["documento_id"] == doc_id

    response = client.put(f"/documentos-personal/{doc_id}", json={"activo": True})
    assert response.json()["activo"] is True
