from fastapi.testclient import TestClient
from src.main import app
from src.personal.models import PersonaCapacidad
from datetime import datetime, timedelta
from tests.database import session, TestingSessionLocal
import uuid
import random

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

def crear_capacidad_auxiliar():
    nombre_cap = generar_string_unico("CapAux")
    res = client.post("/capacidades/", json={"nombre": nombre_cap})
    return res.json()["id"]

def test_crear_persona():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    legajo = random.randint(10000, 99999)
    
    payload = {
        "nombre": "Juan",
        "apellido": "Perez",
        "dni": dni,
        "legajo": legajo,
        "capacidades_ids": [cap_id]
    }
    response = client.post("/personal/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["dni"] == dni
    assert data["activo"] is True
    assert len(data["capacidades"]) == 1
    assert data["capacidades"][0]["capacidad_id"] == cap_id

def test_crear_persona_sin_capacidades():
    dni = str(random.randint(10000000, 99999999))
    payload = {
        "nombre": "Ana",
        "apellido": "Gomez",
        "dni": dni,
        "legajo": random.randint(10000, 99999),
        "capacidades_ids": []
    }
    response = client.post("/personal/", json=payload)
    # Pydantic intercepta el array vacío por el min_length=1 del schema y devuelve 422
    assert response.status_code == 422

def test_crear_persona_duplicada():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    payload = {
        "nombre": "Carlos",
        "apellido": "Lopez",
        "dni": dni,
        "legajo": random.randint(10000, 99999),
        "capacidades_ids": [cap_id]
    }
    
    client.post("/personal/", json=payload)
    response = client.post("/personal/", json=payload)
    
    assert response.status_code == 409
    assert response.json()["detail"] == "Ya existe un miembro del personal con el mismo DNI o Legajo."

def test_crear_persona_requiere_reactivacion():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    payload = {
        "nombre": "Maria",
        "apellido": "Gimenez",
        "dni": dni,
        "legajo": random.randint(10000, 99999),
        "capacidades_ids": [cap_id]
    }
    
    res_post = client.post("/personal/", json=payload)
    persona_id = res_post.json()["id"]
    
    client.delete(f"/personal/{persona_id}")
    
    res_conflicto = client.post("/personal/", json=payload)
    assert res_conflicto.status_code == 409
    detail = res_conflicto.json()["detail"]
    assert detail["code"] == "El miembro del personal ya existe pero está dado de baja."
    assert detail["persona_id"] == persona_id

def test_bloquear_baja_por_put_personal():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    res_post = client.post("/personal/", json={
        "nombre": "Test", "apellido": "Baja Put", "dni": dni, "legajo": random.randint(10000, 99999), "capacidades_ids": [cap_id]
    })
    persona_id = res_post.json()["id"]

    res_put = client.put(f"/personal/{persona_id}", json={"activo": False})
    assert res_put.status_code == 400
    assert res_put.json()["detail"] == "La baja del personal debe realizarse mediante el endpoint de eliminación."

def test_eliminar_y_reactivar_persona_con_capacidades():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    res_post = client.post("/personal/", json={
        "nombre": "Lucas", "apellido": "Reactivar", "dni": dni, "legajo": random.randint(10000, 99999), "capacidades_ids": [cap_id]
    })
    persona_id = res_post.json()["id"]

    # Baja
    res_del = client.delete(f"/personal/{persona_id}")
    assert res_del.status_code == 200
    assert res_del.json()["activo"] is False
    assert len([c for c in res_del.json()["capacidades"] if c["activo"]]) == 0

    # Reactivación
    res_put = client.put(f"/personal/{persona_id}", json={"activo": True})
    assert res_put.status_code == 200
    assert res_put.json()["activo"] is True
    capacidades_activas = [c for c in res_put.json()["capacidades"] if c["activo"]]
    assert len(capacidades_activas) == 1
    assert capacidades_activas[0]["capacidad_id"] == cap_id

def test_reactivar_persona_con_capacidad_inactiva():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    res_post = client.post("/personal/", json={
        "nombre": "Pedro", "apellido": "Inactivo", "dni": dni, "legajo": random.randint(10000, 99999), "capacidades_ids": [cap_id]
    })
    persona_id = res_post.json()["id"]

    # Se da de baja a la persona
    client.delete(f"/personal/{persona_id}")
    
    # Se da de baja la capacidad globalmente
    client.delete(f"/capacidades/{cap_id}")

    # Se intenta reactivar a la persona
    res_put = client.put(f"/personal/{persona_id}", json={"activo": True})
    
    assert res_put.status_code == 409
    assert res_put.json()["detail"] == "Una de las capacidades asociadas está dada de baja. Debe reactivar la capacidad primero."
    
def test_reactivar_persona_mismo_dia_recicla_registro():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    
    # Se crea la persona
    res_post = client.post("/personal/", json={
        "nombre": "Mismo", "apellido": "Dia", "dni": dni, "legajo": random.randint(10000, 99999), "capacidades_ids": [cap_id]
    })
    persona_id = res_post.json()["id"]
    
    # Se verifica que tiene 1 solo registro de capacidad
    assert len(res_post.json()["capacidades"]) == 1

    # Se le da de baja (El sistema le pone fecha_hasta de hoy)
    client.delete(f"/personal/{persona_id}")

    # Se reactiva inmediatamente (Mismo día)
    res_put = client.put(f"/personal/{persona_id}", json={"activo": True})
    assert res_put.status_code == 200
    
    data = res_put.json()
    
    # VALIDACIÓN CLAVE: Como es el mismo día, NO debe haber creado un segundo registro.
    # Debe haber reciclado el que ya existía, borrando su fecha_hasta y poniéndolo activo.
    assert len(data["capacidades"]) == 1
    assert data["capacidades"][0]["activo"] is True
    assert data["capacidades"][0]["fecha_hasta"] is None

def test_reactivar_persona_distinto_dia_crea_historial():
    cap_id = crear_capacidad_auxiliar()
    dni = str(random.randint(10000000, 99999999))
    
    # Se crea la persona
    res_post = client.post("/personal/", json={
        "nombre": "Distinto", "apellido": "Dia", "dni": dni, "legajo": random.randint(10000, 99999), "capacidades_ids": [cap_id]
    })
    persona_id = res_post.json()["id"]

    # Se le da de baja
    client.delete(f"/personal/{persona_id}")
    
    # Se usa la sesión de la base de datos de prueba para fingir que la baja fue ayer
    db = TestingSessionLocal()
    capacidad_db = db.query(PersonaCapacidad).filter_by(persona_id=persona_id).first()
    
    # Se le resta 1 día a la fecha de baja
    fecha_ayer = datetime.now() - timedelta(days=1)
    capacidad_db.fecha_hasta = fecha_ayer
    db.commit()
    db.close()

    # Se reactiva la persona hoy
    res_put = client.put(f"/personal/{persona_id}", json={"activo": True})
    assert res_put.status_code == 200
    
    data = res_put.json()
    
    # VALIDACIÓN CLAVE: Como la baja fue ayer, el sistema DEBE crear un registro nuevo.
    # Ahora el historial debe tener exactamente 2 registros.
    assert len(data["capacidades"]) == 2
    
    # Se filtra para ver el estado de cada uno
    inactivos = [c for c in data["capacidades"] if not c["activo"]]
    activos = [c for c in data["capacidades"] if c["activo"]]
    
    assert len(inactivos) == 1
    assert len(activos) == 1
    
    # El inactivo debe tener la fecha de ayer
    assert inactivos[0]["fecha_hasta"] is not None
    # El activo debe ser el nuevo creado hoy
    assert activos[0]["fecha_hasta"] is None