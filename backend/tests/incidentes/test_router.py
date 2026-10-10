from datetime import datetime
from fastapi.testclient import TestClient
from src.main import app
from src.personal.models import Persona
from tests.database import session
import json
from itertools import count

cl = TestClient(app)

contador_personas = count(1)
contador_capacidades = count(1)
contador_tipos = count(1)

def crear_capacidad_auxiliar():
    # Se crea una capacidad auxiliar para usarla en los tests
    numero = next(contador_capacidades)

    data = {
        "nombre": f"Capacidad Test {numero}",
        "descripcion": "Descripción de la capacidad de prueba"
    }
    res = cl.post("/capacidades/", json=data)
    assert res.status_code == 201, res.json()
    return res.json()["id"]

def crear_persona_auxiliar():
    # Se crea una persona auxiliar para usarla como reportante en los tests
    numero = next(contador_personas)

    persona = {
        "nombre": "Auxiliar",
        "apellido": "Test",
        "dni": f"{numero}",
        "legajo": numero,
        "capacidades_ids": [crear_capacidad_auxiliar()]
    }
    res = cl.post("/personal/", json=persona)
    assert res.status_code == 201, res.json()
    return res.json()["id"]

def crear_tipo_incidente_auxiliar():
    # Se crea un tipo de incidente auxiliar para usarlo en los tests
    numero = next(contador_tipos)

    data = {
        "nombre": f"Tipo Test {numero}",
        "descripcion": "Descripcion de tipo de prueba"
    }
    res = cl.post("/tipos-incidente/", json=data)
    assert res.status_code == 201, res.json()
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

    response = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
        )
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

    response = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
        )
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

    response = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
        )
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
    res_post = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
    )
    assert res_post.status_code == 201

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
    res = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
    )

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
    res = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
    )

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
    res = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
    )

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
    res_post = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data)},
    )

    # 3. Confirmo que se crea
    assert res_post.status_code == 201
    incidente_id = res_post.json()["id"]

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

def test_listar_incidentes_abiertos(session):
    # Se crea un incidente para listar
    data1 = {
        "titulo": "Incidente de prueba 1",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }
    res1 = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data1)},
    )
    assert res1.status_code == 201
    incidente1_id = res1.json()["id"]

    # Se crea otro incidente para listar
    data2 = {
        "titulo": "Incidente de prueba 2",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }
    res2 = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data2)},
    )
    assert res2.status_code == 201
    incidente2_id = res2.json()["id"]

    # Se registra la accion correctiva para un incidente
    # Primero creo la persona que cierra el incidente
    responsable_id = crear_persona_auxiliar()

    # Hago el cierre
    res_cierre = cl.post(
        f"/incidentes/{incidente1_id}/cierre",
        json={
            "accion_correctiva": "Acción correctiva de prueba",
            "responsable_cierre_id": responsable_id,
        },
    )
    assert res_cierre.status_code == 200
    assert res_cierre.json()["accion_correctiva"] == (
        "Acción correctiva de prueba"
    )

    # Se listan los incidentes abiertos
    response = cl.get("/incidentes/abiertos")
    assert response.status_code == 200

    # Veo si el incidente listado es el que esta abierto
    incidentes_abiertos = response.json()
    ids_abiertos = [incidente["id"] for incidente in incidentes_abiertos]

    assert incidente2_id in ids_abiertos # es el que esta abierto
    assert incidente1_id not in ids_abiertos # es el que esta cerrado
    assert all(incidente["abierto"] is True for incidente in incidentes_abiertos)

def test_listar_incidentes_cerrados(session):
    # Se crea un incidente para listar
    data1 = {
        "titulo": "Incidente de prueba 1",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }
    res1 = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data1)},
    )
    assert res1.status_code == 201
    incidente1_id = res1.json()["id"]

    # Se crea otro incidente para listar
    data2 = {
        "titulo": "Incidente de prueba 2",
        "descripcion": "Descripción del incidente de prueba",
        "fecha_hora_reporte": datetime.now().isoformat(),
        "reportante_id": crear_persona_auxiliar(),
        "tipo_id": crear_tipo_incidente_auxiliar(),
    }
    res2 = cl.post(
        "/incidentes/",
        data={"datos": json.dumps(data2)},
    )
    assert res2.status_code == 201
    incidente2_id = res2.json()["id"]

    # Se registra la accion correctiva para un incidente
    # Primero creo la persona que cierra el incidente
    responsable_id = crear_persona_auxiliar()

    # Hago el cierre
    res_cierre = cl.post(
        f"/incidentes/{incidente1_id}/cierre",
        json={
            "accion_correctiva": "Acción correctiva de prueba",
            "responsable_cierre_id": responsable_id,
        },
    )
    assert res_cierre.status_code == 200
    assert res_cierre.json()["accion_correctiva"] == (
        "Acción correctiva de prueba"
    )

    # Se listan los incidentes cerrados
    response = cl.get("/incidentes/cerrados")
    assert response.status_code == 200

    # Veo si el incidente listado es el que esta cerrado
    incidentes_cerrados = response.json()
    ids_cerrados = [incidente["id"] for incidente in incidentes_cerrados]

    assert incidente2_id not in ids_cerrados # es el que esta abierto
    assert incidente1_id in ids_cerrados # es el que esta cerrado
    assert all(incidente["abierto"] is False for incidente in incidentes_cerrados)

def test_listar_incidentes_abiertos_por_tipo(session):
    # Creo tipos para agrupar los incidentes
    tipo_a_id = crear_tipo_incidente_auxiliar()
    tipo_b_id = crear_tipo_incidente_auxiliar()

    # Defino una funcion para poder crear los incidentes mas rapido
    def crear_incidente(titulo, tipo_id):
        data = {
            "titulo": titulo,
            "descripcion": "Descripción de prueba",
            "fecha_hora_reporte": datetime.now().isoformat(),
            "reportante_id": crear_persona_auxiliar(),
            "tipo_id": tipo_id,
        }
        response = cl.post(
            "/incidentes/",
            data={"datos": json.dumps(data)},
        )
        assert response.status_code == 201, response.json()
        return response.json()["id"]

    # Creo 2 incidentes del tipo A y uno del tipo B
    incidente_a1_id = crear_incidente("Incidente A1", tipo_a_id)
    incidente_a2_id = crear_incidente("Incidente A2", tipo_a_id)
    incidente_b1_id = crear_incidente("Incidente B1", tipo_b_id)

    # Creo y cierro otro incidente del tipo A
    incidente_a_cerrado_id = crear_incidente("Incidente A cerrado", tipo_a_id)
    responsable_id = crear_persona_auxiliar()

    res_cierre = cl.post(
        f"/incidentes/{incidente_a_cerrado_id}/cierre",
        json={
            "accion_correctiva": "Acción correctiva de prueba",
            "responsable_cierre_id": responsable_id,
        },
    )
    assert res_cierre.status_code == 200, res_cierre.json()

    # Listo los incidentes agrupados por tipo
    response = cl.get("/incidentes/abiertos/por-tipo")
    assert response.status_code == 200, response.json()

    grupos = {grupo["tipo_id"]: grupo for grupo in response.json()}

    # Reviso que la cantidad de incidentes coincida
    assert set(grupos) == {tipo_a_id, tipo_b_id}
    assert grupos[tipo_a_id]["cantidad"] == 2
    assert grupos[tipo_b_id]["cantidad"] == 1