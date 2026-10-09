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

def crear_tipo_incidente_auxiliar(nombre="Tipo Test"):
    # Se crea un tipo de incidente auxiliar para usarlo en los tests
    data = {
        "nombre": nombre,
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

def crear_incidente_auxiliar(reportante_id, tipo_id, fecha):
    # Se crea un incidente con una fecha puntual para probar filtros
    data = {
        "titulo": "Incidente de prueba",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": fecha.isoformat(),
        "reportante_id": reportante_id,
        "tipo_id": tipo_id,
    }
    res = cl.post("/incidentes/", json=data)
    assert res.status_code == 201
    return res.json()["id"]

def cargar_incidentes_para_estadisticas():
    # 2 incidentes del tipo A (5/10 a las 15:30 y 10/10) y 1 del tipo B (1/10)
    reportante_id = crear_persona_auxiliar()
    tipo_a = crear_tipo_incidente_auxiliar("Tipo A")
    tipo_b = crear_tipo_incidente_auxiliar("Tipo B")

    crear_incidente_auxiliar(reportante_id, tipo_b, datetime(2026, 10, 1, 9, 0))
    crear_incidente_auxiliar(reportante_id, tipo_a, datetime(2026, 10, 5, 15, 30))
    crear_incidente_auxiliar(reportante_id, tipo_a, datetime(2026, 10, 10, 8, 0))
    return tipo_a, tipo_b

def test_estadisticas_sin_incidentes(session):
    res = cl.get("/incidentes/estadisticas")
    assert res.status_code == 200
    assert res.json() == []

def test_estadisticas_sin_filtros(session):
    tipo_a, tipo_b = cargar_incidentes_para_estadisticas()

    res = cl.get("/incidentes/estadisticas")
    assert res.status_code == 200

    # Viene ordenado de mayor a menor cantidad
    assert res.json() == [
        {"tipo_id": tipo_a, "tipo": "Tipo A", "cantidad": 2},
        {"tipo_id": tipo_b, "tipo": "Tipo B", "cantidad": 1},
    ]

def test_estadisticas_con_rango(session):
    tipo_a, tipo_b = cargar_incidentes_para_estadisticas()

    # El rango incluye el 5/10 (aunque sea a las 15:30) y excluye el 10/10
    res = cl.get("/incidentes/estadisticas", params={"desde": "2026-10-01", "hasta": "2026-10-05"})
    assert res.status_code == 200

    cantidades = {e["tipo_id"]: e["cantidad"] for e in res.json()}
    assert cantidades == {tipo_a: 1, tipo_b: 1}

def test_estadisticas_rango_sin_incidentes(session):
    cargar_incidentes_para_estadisticas()

    res = cl.get("/incidentes/estadisticas", params={"desde": "2026-01-01", "hasta": "2026-01-31"})
    assert res.status_code == 200
    assert res.json() == []

def test_estadisticas_rango_invalido(session):
    # desde posterior a hasta
    res = cl.get("/incidentes/estadisticas", params={"desde": "2026-10-10", "hasta": "2026-10-01"})
    assert res.status_code == 400

def test_listar_incidentes_filtrado_por_tipo(session):
    tipo_a, tipo_b = cargar_incidentes_para_estadisticas()

    res = cl.get("/incidentes/", params={"tipo_id": tipo_a})
    assert res.status_code == 200
    assert len(res.json()) == 2
    assert all(i["tipo_id"] == tipo_a for i in res.json())

def test_listar_incidentes_filtrado_por_fechas(session):
    cargar_incidentes_para_estadisticas()

    res = cl.get("/incidentes/", params={"desde": "2026-10-05", "hasta": "2026-10-10"})
    assert res.status_code == 200
    assert len(res.json()) == 2

def test_listar_incidentes_filtrado_por_tipo_y_fechas(session):
    tipo_a, tipo_b = cargar_incidentes_para_estadisticas()

    res = cl.get("/incidentes/", params={"tipo_id": tipo_a, "desde": "2026-10-06", "hasta": "2026-10-10"})
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["tipo_id"] == tipo_a

def test_listar_incidentes_rango_invalido(session):
    res = cl.get("/incidentes/", params={"desde": "2026-10-10", "hasta": "2026-10-01"})
    assert res.status_code == 400