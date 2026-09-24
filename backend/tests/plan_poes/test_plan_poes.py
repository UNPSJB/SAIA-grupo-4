import pytest
import uuid
import random
from fastapi.testclient import TestClient
from src.main import app
from tests.database import session
from src.plan_poes.constants import ErrorCode

# Modelos para inyectar datos falsos por ORM
from src.personal.models import Persona
from src.sectores.models import Sector
from src.equipos.models import Equipo
from src.insumo_quimico.models import InsumoQuimico
from src.elementos_limpieza.models import ElementoLimpieza
from src.unidad_medida.models import UnidadMedida

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

@pytest.fixture
def datos_base(session):
    # Se crean las entidades independientes
    p = Persona(nombre="Autor", apellido="Test", dni=str(random.randint(10000000, 99999999)), legajo=random.randint(1000, 9999), activo=True)
    s = Sector(nombre=generar_string_unico("Sector"), activo=True)
    el = ElementoLimpieza(nombre=generar_string_unico("Trapo"), activo=True)
    
    um = UnidadMedida(nombre="Litros", simbolo="L", tipo_magnitud="Volumen", disponible=True)
    
    session.add_all([p, s, el, um])
    session.commit()
    
    for entidad in (p, s, el, um):
        session.refresh(entidad)

    # Se crean las entidades dependientes (Insumo y Equipo)
    iq = InsumoQuimico(
        nombre=generar_string_unico("Insumo"), 
        tipo="Desinfectante", 
        unidad_medida_id=um.id, 
        activo=True
    )
    eq = Equipo(
        nombre=generar_string_unico("Equipo"), 
        marca="Test", 
        numero_serie=generar_string_unico("SN"), 
        categoria="Maquinaria",
        sector_id=s.id, 
        activo=True
    )
    
    session.add_all([iq, eq])
    session.commit()
    session.refresh(iq)
    session.refresh(eq)
    
    return {
        "persona_id": p.id,
        "sector_id": s.id,
        "equipo_id": eq.id,
        "insumo_id": iq.id,
        "elemento_id": el.id
    }


def test_crear_plan_borrador_exitoso(datos_base):
    payload = {
        "nombre": "Plan de Limpieza General",
        "objetivo": "Mantener inocuidad",
        "elaborado_por_id": datos_base["persona_id"]
    }
    response = client.post("/planes-poes/", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["nombre"] == payload["nombre"]
    assert data["activo"] is False
    assert data["fecha_emision"] is None

def test_crear_segundo_borrador_falla_por_conflicto(datos_base):
    payload = {"nombre": "Plan 1", "elaborado_por_id": datos_base["persona_id"]}
    client.post("/planes-poes/", json=payload)
    
    response = client.post("/planes-poes/", json={"nombre": "Plan 2", "elaborado_por_id": datos_base["persona_id"]})
    assert response.status_code == 409
    assert response.json()["detail"] == ErrorCode.BORRADOR_YA_EXISTENTE

def test_activar_plan_sin_tareas_falla(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan Vacío", "elaborado_por_id": datos_base["persona_id"]})
    plan_id = res_plan.json()["id"]
    
    res_activar = client.post(f"/planes-poes/{plan_id}/activar")
    assert res_activar.status_code == 400
    assert res_activar.json()["detail"] == ErrorCode.PLAN_SIN_TAREAS

def test_flujo_completo_activar_archivar_y_clonar(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan V1", "elaborado_por_id": datos_base["persona_id"]})
    plan_id = res_plan.json()["id"]
    
    client.post(f"/planes-poes/{plan_id}/tareas", json={
        "nombre": "Limpieza Profunda", "tipo_poes": "pre_operacional", "frecuencia": "diaria",
        "sector_id": datos_base["sector_id"], "metodo": "Fregar fuerte",
        "elementos_limpieza": [{"elemento_limpieza_id": datos_base["elemento_id"]}]
    })
    
    res_activar = client.post(f"/planes-poes/{plan_id}/activar")
    assert res_activar.status_code == 200
    assert res_activar.json()["activo"] is True
    assert res_activar.json()["fecha_emision"] is not None
    
    res_archivar = client.post(f"/planes-poes/{plan_id}/archivar")
    assert res_archivar.status_code == 200
    assert res_archivar.json()["activo"] is False
    assert res_archivar.json()["fecha_hasta"] is not None
    
    res_clon = client.post(f"/planes-poes/{plan_id}/clonar?elaborado_por_id={datos_base['persona_id']}")
    assert res_clon.status_code == 201
    
    clon_data = res_clon.json()
    assert clon_data["id"] != plan_id
    assert clon_data["nombre"] == "Plan V1"
    assert clon_data["activo"] is False
    assert len(clon_data["tareas"]) == 1


def test_tarea_falla_sin_equipo_ni_sector(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    
    payload_tarea = {
        "nombre": "Limpiar Nada", "tipo_poes": "pre_operacional", "frecuencia": "diaria", "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"], "dosis_sugerida": 2.0}]
    }
    response = client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=payload_tarea)
    assert response.status_code == 422
    assert "La tarea debe estar asignada a un Equipo O a un Sector" in response.text

def test_tarea_falla_con_equipo_y_sector_simultaneos(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    
    payload_tarea = {
        "nombre": "Limpiar Todo", "tipo_poes": "pre_operacional", "frecuencia": "diaria", "metodo": "Agua y jabón",
        "equipo_id": datos_base["equipo_id"], "sector_id": datos_base["sector_id"],
        "elementos_limpieza": [{"elemento_limpieza_id": datos_base["elemento_id"]}]
    }
    response = client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=payload_tarea)
    assert response.status_code == 422

def test_tarea_falla_sin_recursos_minimos(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    
    payload_tarea = {
        "nombre": "Limpiar sin recursos", "tipo_poes": "pre_operacional", "frecuencia": "diaria",
        "sector_id": datos_base["sector_id"], "metodo": "Magia y jabón",
        "insumos_quimicos": [], "elementos_limpieza": []
    }
    response = client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=payload_tarea)
    assert response.status_code == 422
    assert "La tarea debe incluir al menos un producto químico o un elemento" in response.text



def test_tarea_diaria_rechaza_detalle(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    
    payload = {
        "nombre": "Diaria Mal", "tipo_poes": "operacional", "frecuencia": "diaria", 
        "detalle_frecuencia": "lunes", 
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    }
    response = client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=payload)
    assert response.status_code == 422
    assert "Si la frecuencia es 'diaria', el campo detalle_frecuencia debe ser nulo" in response.text

def test_tarea_semanal_validaciones(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    base_payload = {
        "nombre": "Semanal", "tipo_poes": "operacional", "frecuencia": "semanal",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    }

    base_payload["detalle_frecuencia"] = "osvaldo" # Día inexistente
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 422
    
    base_payload["detalle_frecuencia"] = None # Falta detalle
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 422

    base_payload["detalle_frecuencia"] = "miercoles" # Válido
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 201

def test_tarea_mensual_validaciones(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    base_payload = {
        "nombre": "Mensual", "tipo_poes": "operacional", "frecuencia": "mensual",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    }

    base_payload["detalle_frecuencia"] = "32" # Fuera de rango
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 422
    
    base_payload["detalle_frecuencia"] = "quince" # String en vez de número
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 422

    base_payload["detalle_frecuencia"] = "15" # Válido
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 201

def test_tarea_dias_especificos_validaciones(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    base_payload = {
        "nombre": "Específicos", "tipo_poes": "operacional", "frecuencia": "dias_especificos",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    }

    base_payload["detalle_frecuencia"] = "lun,domingo" # Abreviatura inválida
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 422

    base_payload["detalle_frecuencia"] = "lun,mar,lun" # Días repetidos
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 422

    base_payload["detalle_frecuencia"] = "lun, mar, vie" # Válido
    assert client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json=base_payload).status_code == 201


def test_bloquear_baja_tarea_por_patch(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    res_tarea = client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json={
        "nombre": "Limpiar Piso", "tipo_poes": "operacional", "frecuencia": "diaria",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "elementos_limpieza": [{"elemento_limpieza_id": datos_base["elemento_id"]}]
    })
    
    res_patch = client.patch(f"/planes-poes/tareas/{res_tarea.json()['id']}", json={"activo": False})
    assert res_patch.status_code == 400
    assert res_patch.json()["detail"] == ErrorCode.BAJA_POR_PATCH_NO_PERMITIDA

def test_reactivacion_estricta_tarea(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    res_tarea = client.post(f"/planes-poes/{res_plan.json()['id']}/tareas", json={
        "nombre": "Tarea Zombie", "tipo_poes": "operacional", "frecuencia": "diaria",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    })
    tarea_id = res_tarea.json()["id"]

    client.delete(f"/planes-poes/tareas/{tarea_id}")

    # Reactivación no estricta (falla)
    res_fail = client.patch(f"/planes-poes/tareas/{tarea_id}", json={"activo": True, "metodo": "Trampa"})
    assert res_fail.status_code == 409
    assert res_fail.json()["detail"] == ErrorCode.TAREA_INACTIVA

    # Reactivación estricta (pasa)
    res_ok = client.patch(f"/planes-poes/tareas/{tarea_id}", json={"activo": True})
    assert res_ok.status_code == 200
    assert res_ok.json()["activo"] is True

def test_modificar_tarea_de_plan_archivado_falla(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan Efímero", "elaborado_por_id": datos_base["persona_id"]})
    plan_id = res_plan.json()["id"]
    
    res_tarea = client.post(f"/planes-poes/{plan_id}/tareas", json={
        "nombre": "Tarea Intocable", "tipo_poes": "operacional", "frecuencia": "diaria",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    })
    
    client.post(f"/planes-poes/{plan_id}/activar")
    client.post(f"/planes-poes/{plan_id}/archivar")

    res_patch = client.patch(f"/planes-poes/tareas/{res_tarea.json()['id']}", json={"metodo": "Intento de hackeo"})
    assert res_patch.status_code == 400
    assert res_patch.json()["detail"] == ErrorCode.PLAN_ARCHIVADO_NO_EDITABLE

def test_eliminar_tarea_de_plan_archivado_falla(datos_base):
    res_plan = client.post("/planes-poes/", json={"nombre": "Plan", "elaborado_por_id": datos_base["persona_id"]})
    plan_id = res_plan.json()["id"]
    
    res_tarea = client.post(f"/planes-poes/{plan_id}/tareas", json={
        "nombre": "Tarea", "tipo_poes": "operacional", "frecuencia": "diaria",
        "sector_id": datos_base["sector_id"], "metodo": "Agua y jabón",
        "insumos_quimicos": [{"insumo_quimico_id": datos_base["insumo_id"]}]
    })
    
    client.post(f"/planes-poes/{plan_id}/activar")
    client.post(f"/planes-poes/{plan_id}/archivar")

    res_delete = client.delete(f"/planes-poes/tareas/{res_tarea.json()['id']}")
    assert res_delete.status_code == 400
    assert res_delete.json()["detail"] == ErrorCode.PLAN_ARCHIVADO_NO_EDITABLE