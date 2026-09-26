import pytest
import uuid
import random
import json
from datetime import date, timedelta
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.checklists.constants import ErrorCode, EstadoEjecucion
from src.checklists.services import _filtrar_tareas_por_dia

# Modelos para inyectar datos falsos por ORM
from src.personal.models import Persona
from src.sectores.models import Sector
from src.insumo_quimico.models import InsumoQuimico
from src.unidad_medida.models import UnidadMedida
from src.plan_poes.models import PlanPOES, TareaPOES, TareaInsumoQuimico
from src.checklists.models import EjecucionTarea

client = TestClient(app)

def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

@pytest.fixture
def datos_base(session):
    """Crea un entorno base completo incluyendo un Plan Activo y una Tarea Diaria."""
    p = Persona(nombre="Autor", apellido="Test", dni=str(random.randint(10000000, 99999999)), legajo=random.randint(1000, 9999), activo=True)
    s = Sector(nombre=generar_string_unico("Sector"), activo=True)
    um = UnidadMedida(nombre="Litros", simbolo="L", tipo_magnitud="Volumen", disponible=True)
    
    session.add_all([p, s, um])
    session.commit()
    for entidad in (p, s, um): session.refresh(entidad)

    iq = InsumoQuimico(
        nombre=generar_string_unico("Insumo"), 
        tipo="Desinfectante", 
        unidad_medida_id=um.id, 
        activo=True,
        consumo=0.0 # Se inicializa el acumulador
    )
    
    plan = PlanPOES(nombre=generar_string_unico("Plan"), elaborado_por_id=p.id, activo=True)
    
    session.add_all([iq, plan])
    session.commit()
    session.refresh(iq)
    session.refresh(plan)

    tarea = TareaPOES(
        plan_id=plan.id,
        nombre="Limpieza Diaria Test",
        tipo_poes="operacional",
        frecuencia="diaria",
        sector_id=s.id,
        metodo="Fregar",
        activo=True
    )
    session.add(tarea)
    session.commit()
    session.refresh(tarea)

    tarea_insumo = TareaInsumoQuimico(tarea_id=tarea.id, insumo_quimico_id=iq.id)
    session.add(tarea_insumo)
    session.commit()

    return {
        "persona_id": p.id,
        "sector_id": s.id,
        "insumo_id": iq.id,
        "plan_id": plan.id,
        "tarea_id": tarea.id
    }


# TESTS: GET /hoy (Generación y Vencimientos)

def test_get_hoy_genera_tareas_y_cierra_vencidas(datos_base, session):
    ayer = date.today() - timedelta(days=1)
    
    # Se inyecta una ejecución PENDIENTE de ayer
    ejecucion_ayer = EjecucionTarea(
        id_tarea=datos_base["tarea_id"],
        fecha_programada=ayer,
        estado=EstadoEjecucion.PENDIENTE
    )
    session.add(ejecucion_ayer)
    session.commit()
    session.refresh(ejecucion_ayer)

    # Se llama al endpoint de hoy
    res = client.get("/checklists/hoy")
    assert res.status_code == 200
    data = res.json()
    
    # Se verifica que se generó la de hoy
    assert len(data) >= 1
    tarea_hoy = next((t for t in data if t["tarea"]["id"] == datos_base["tarea_id"]), None)
    assert tarea_hoy is not None
    assert tarea_hoy["estado"] == EstadoEjecucion.PENDIENTE
    assert tarea_hoy["fecha_programada"] == date.today().isoformat()
    assert len(tarea_hoy["tarea"]["insumos_quimicos"]) == 1 # Verifica los selectinload anidados

    # Se verifica que la de ayer se cerró automáticamente en la BD
    session.refresh(ejecucion_ayer)
    assert ejecucion_ayer.estado == EstadoEjecucion.NO_REALIZADA


# TESTS: PATCH /{id}/completar (Completar Tarea)

def test_completar_ejecucion_exito_incrementa_consumo(datos_base, session):
    # Aseguramos que la tarea del día esté generada
    res_hoy = client.get("/checklists/hoy")
    ejec_id = res_hoy.json()[0]["id"]
    
    cantidad_usada = 5.5
    payload = {
        "operador_id": datos_base["persona_id"],
        "observaciones": "Todo en orden",
        "consumos": [{"insumo_quimico_id": datos_base["insumo_id"], "cantidad_utilizada": cantidad_usada}]
    }

    # Se envia como multipart/form-data con el JSON como string en "datos"
    res = client.patch(f"/checklists/{ejec_id}/completar", data={"datos": json.dumps(payload)})
    
    assert res.status_code == 200
    assert res.json()["estado"] == EstadoEjecucion.COMPLETADA
    assert res.json()["observaciones"] == "Todo en orden"

    # Se verifica que el consumo ACUMULATIVO en el insumo incrementó en la BD
    insumo = session.get(InsumoQuimico, datos_base["insumo_id"])
    assert float(insumo.consumo) == cantidad_usada


def test_completar_con_foto_opcional(datos_base):
    ejec_id = client.get("/checklists/hoy").json()[0]["id"]
    
    payload = {"operador_id": datos_base["persona_id"], "consumos": []}
    archivo_falso = ("evidencia.jpg", b"fake_image_bytes", "image/jpeg")

    res = client.patch(
        f"/checklists/{ejec_id}/completar",
        data={"datos": json.dumps(payload)},
        files={"foto": archivo_falso}
    )
    
    assert res.status_code == 200
    assert res.json()["foto_url"] is not None
    assert "evidencia.jpg" in res.json()["foto_url"]


def test_completar_falla_por_inmutabilidad(datos_base):
    ejec_id = client.get("/checklists/hoy").json()[0]["id"]
    payload = {"operador_id": datos_base["persona_id"], "consumos": []}
    
    # Primer completado (Exitoso)
    client.patch(f"/checklists/{ejec_id}/completar", data={"datos": json.dumps(payload)})
    
    # Segundo completado (Falla por inmutable)
    res_conflicto = client.patch(f"/checklists/{ejec_id}/completar", data={"datos": json.dumps(payload)})
    assert res_conflicto.status_code == 409
    assert res_conflicto.json()["detail"] == ErrorCode.EJECUCION_YA_COMPLETADA


def test_completar_falla_por_vencida(datos_base, session):
    ejec_id = client.get("/checklists/hoy").json()[0]["id"]
    
    # Se fuerza estado a NO_REALIZADA simulando que venció
    ejecucion = session.get(EjecucionTarea, ejec_id)
    ejecucion.estado = EstadoEjecucion.NO_REALIZADA
    session.commit()

    payload = {"operador_id": datos_base["persona_id"], "consumos": []}
    res = client.patch(f"/checklists/{ejec_id}/completar", data={"datos": json.dumps(payload)})
    
    assert res.status_code == 409
    assert res.json()["detail"] == ErrorCode.EJECUCION_VENCIDA


def test_completar_falla_por_json_invalido(datos_base):
    ejec_id = client.get("/checklists/hoy").json()[0]["id"]
    
    # Se envía un string que no es un JSON válido
    res = client.patch(f"/checklists/{ejec_id}/completar", data={"datos": "esto_no_es_un_json"})
    
    assert res.status_code == 400
    assert res.json()["detail"] == ErrorCode.FORMATO_JSON_INVALIDO


# TESTS: GET /historial (Filtros y Consultas)

def test_historial_exito_solo_trae_cerradas(datos_base, session):
    ayer = date.today() - timedelta(days=1)
    anteayer = date.today() - timedelta(days=2)
    
    # Se una COMPLETADA y una NO_REALIZADA
    e1 = EjecucionTarea(id_tarea=datos_base["tarea_id"], fecha_programada=ayer, estado=EstadoEjecucion.COMPLETADA)
    e2 = EjecucionTarea(id_tarea=datos_base["tarea_id"], fecha_programada=anteayer, estado=EstadoEjecucion.NO_REALIZADA)
    session.add_all([e1, e2])
    session.commit()

    # Se consulta el historial
    res = client.get(f"/checklists/historial?desde={anteayer.isoformat()}&hasta={ayer.isoformat()}")
    assert res.status_code == 200
    
    data = res.json()
    assert len(data) == 2
    # Se comprueba que el endpoint no haya traído nada PENDIENTE
    assert all(d["estado"] in [EstadoEjecucion.COMPLETADA.value, EstadoEjecucion.NO_REALIZADA.value] for d in data)


def test_historial_validaciones_de_fecha():
    hoy_str = date.today().isoformat()
    ayer_str = (date.today() - timedelta(days=1)).isoformat()
    manana_str = (date.today() + timedelta(days=1)).isoformat()

    # Falla: Desde > Hasta
    res_rango = client.get(f"/checklists/historial?desde={hoy_str}&hasta={ayer_str}")
    assert res_rango.status_code == 400
    assert res_rango.json()["detail"] == ErrorCode.RANGO_FECHAS_INVALIDO

    # Falla: Hasta es el día de hoy
    res_hoy = client.get(f"/checklists/historial?desde={ayer_str}&hasta={hoy_str}")
    assert res_hoy.status_code == 400
    assert res_hoy.json()["detail"] == ErrorCode.FECHA_FUTURA_HISTORIAL

    # Falla: Hasta es en el futuro
    res_futuro = client.get(f"/checklists/historial?desde={ayer_str}&hasta={manana_str}")
    assert res_futuro.status_code == 400
    assert res_futuro.json()["detail"] == ErrorCode.FECHA_FUTURA_HISTORIAL
    
# Test de logica de frecuencias

def test_filtro_tareas_por_frecuencia_y_dia():
    # Usamos fechas conocidas para la prueba
    # 2024-01-15 fue Lunes
    # 2024-01-16 fue Martes
    fecha_lunes_15 = date(2024, 1, 15)
    fecha_martes_16 = date(2024, 1, 16)

    # Se simulan tareas en memoria
    t_diaria = TareaPOES(id=1, activo=True, frecuencia="diaria")
    t_semanal_lun = TareaPOES(id=2, activo=True, frecuencia="semanal", detalle_frecuencia="lunes")
    t_semanal_mar = TareaPOES(id=3, activo=True, frecuencia="semanal", detalle_frecuencia="martes")
    t_mensual_15 = TareaPOES(id=4, activo=True, frecuencia="mensual", detalle_frecuencia="15")
    t_mensual_16 = TareaPOES(id=5, activo=True, frecuencia="mensual", detalle_frecuencia="16")
    t_especificos = TareaPOES(id=6, activo=True, frecuencia="dias_especificos", detalle_frecuencia="lun, mie, vie")

    todas_las_tareas = [t_diaria, t_semanal_lun, t_semanal_mar, t_mensual_15, t_mensual_16, t_especificos]

    # Prueba 1: Se evalua el Lunes 15
    resultado_lunes = _filtrar_tareas_por_dia(todas_las_tareas, fecha_lunes_15)
    ids_lunes = [t.id for t in resultado_lunes]
    
    assert 1 in ids_lunes  # Diaria: siempre aparece
    assert 2 in ids_lunes  # Semanal lunes: debe aparecer
    assert 3 not in ids_lunes # Semanal martes: NO debe aparecer
    assert 4 in ids_lunes  # Mensual 15: debe aparecer
    assert 5 not in ids_lunes # Mensual 16: NO debe aparecer
    assert 6 in ids_lunes  # Días específicos (incluye 'lun'): debe aparecer

    # Prueba 2: Se evalua el Martes 16
    resultado_martes = _filtrar_tareas_por_dia(todas_las_tareas, fecha_martes_16)
    ids_martes = [t.id for t in resultado_martes]
    
    assert 1 in ids_martes  # Diaria: siempre aparece
    assert 2 not in ids_martes # Semanal lunes: NO debe aparecer
    assert 3 in ids_martes  # Semanal martes: debe aparecer
    assert 4 not in ids_martes # Mensual 15: NO debe aparecer
    assert 5 in ids_martes  # Mensual 16: debe aparecer
    assert 6 not in ids_martes # Días específicos: NO debe aparecer (martes no está en lun,mie,vie)