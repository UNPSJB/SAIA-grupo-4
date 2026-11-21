import json
import random
import uuid
from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient

from src.elementos_limpieza.models import ElementoLimpieza
from src.equipos.models import Equipo
from src.insumos.models import Insumo
from src.main import app
from src.personal.models import Persona
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import PasoEquipo, PasoInsumo, PasoReceta, Receta
from src.unidad_medida.models import UnidadMedida
from src.utils.operabilidad import TipoBaja
from tests.database import session  # noqa: F401

client = TestClient(app)


def _uid(prefijo: str) -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


def _crear_sector() -> int:
    res = client.post("/sectores/", json={"nombre": _uid("Sector")})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def _crear_equipo(
    sector_id: int,
    frecuencia_dias: int | None = None,
    fecha_ultima: date | None = None,
) -> dict:
    payload = {
        "nombre": _uid("Equipo"),
        "marca": "MarcaTest",
        "numero_serie": _uid("SN"),
        "categoria": "balanza",
        "sector_id": sector_id,
        "frecuencia_calibracion_dias": frecuencia_dias,
        "fecha_ultima_calibracion": fecha_ultima.isoformat() if fecha_ultima else None,
    }
    res = client.post("/equipos/", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def _crear_persona() -> dict:
    cap = client.post("/capacidades/", json={"nombre": _uid("Cap")}).json()
    dni = str(random.randint(10_000_000, 99_999_999))
    res = client.post(
        "/personal/",
        json={
            "nombre": "Operador",
            "apellido": _uid("Test"),
            "dni": dni,
            "legajo": random.randint(10000, 99999),
            "capacidades_ids": [cap["id"]],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _crear_elemento(
    session,
    frecuencia_dias: int | None = None,
    dias_desde_ultimo_recambio: int = 0,
) -> dict:
    tipo = client.post(
        "/tipos-elemento-limpieza/",
        json={
            "nombre": _uid("TipoEl"),
            "prefijo": "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=3)),
        },
    )
    assert tipo.status_code == 201, tipo.text
    res = client.post(
        "/elementos-limpieza/",
        json={
            "nombre": _uid("Trapo"),
            "tipo_id": tipo.json()["id"],
            "frecuencia_recambio_dias": frecuencia_dias,
        },
    )
    assert res.status_code == 201, res.text
    elemento = res.json()
    if dias_desde_ultimo_recambio > 0:
        el_db = session.get(ElementoLimpieza, elemento["id"])
        el_db.fecha_ultimo_recambio = datetime.now() - timedelta(days=dias_desde_ultimo_recambio)
        session.commit()
    return client.get(f"/elementos-limpieza/{elemento['id']}").json()


def _crear_documento(persona_id: int, fecha_proxima_revision: date | None) -> dict:
    datos = {
        "titulo": _uid("Doc"),
        "tipo_documento": "PROCEDIMIENTO",
        "creado_por_id": persona_id,
        "version_inicial": "v1.0",
        "fecha_proxima_revision": fecha_proxima_revision.isoformat() if fecha_proxima_revision else None,
    }
    res = client.post(
        "/documentos/",
        data={"datos": json.dumps(datos)},
        files={"archivo": ("proc.pdf", b"%PDF-1.4 contenido", "application/pdf")},
    )
    assert res.status_code == 201, res.text
    return res.json()


# =====================================================================
# CA 1: Operabilidad, estado_vencimiento y motivos_no_operables
# =====================================================================

def test_ca1_operabilidad_en_listado_y_detalle_de_los_4_maestros(session):
    hoy = date.today()
    sector_id = _crear_sector()

    # 1) Equipos: sin_configurar, vigente, proximo, vencido (activo pero NO operable)
    eq_sin = _crear_equipo(sector_id)
    eq_vig = _crear_equipo(sector_id, frecuencia_dias=60, fecha_ultima=hoy)
    eq_prox = _crear_equipo(sector_id, frecuencia_dias=20, fecha_ultima=hoy - timedelta(days=15))
    eq_venc = _crear_equipo(sector_id, frecuencia_dias=10, fecha_ultima=hoy - timedelta(days=20))

    assert eq_sin["operable"] is True and eq_sin["estado_vencimiento"] == "sin_configurar"
    assert eq_vig["operable"] is True and eq_vig["estado_vencimiento"] == "vigente"
    assert eq_prox["operable"] is True and eq_prox["estado_vencimiento"] == "proximo"
    assert eq_venc["activo"] is True
    assert eq_venc["operable"] is False
    assert eq_venc["estado_vencimiento"] == "vencido"
    assert len(eq_venc["motivos_no_operables"]) == 1

    # Filtro solo_operables excluye al vencido
    ids_operables = {e["id"] for e in client.get("/equipos/", params={"solo_operables": "true"}).json()}
    assert eq_vig["id"] in ids_operables
    assert eq_venc["id"] not in ids_operables

    # 2) Personal: activo con documento vencido -> no operable
    persona = _crear_persona()
    doc_p = client.post("/documentos-personal/", json={"nombre": _uid("Libreta"), "vigencia_dias": 365}).json()
    res_venc = client.post(
        f"/personal/{persona['id']}/vencimientos",
        json={"documento_id": doc_p["id"], "fecha_vencimiento": (hoy - timedelta(days=3)).isoformat()},
    )
    assert res_venc.status_code == 201, res_venc.text
    p_det = client.get(f"/personal/{persona['id']}").json()
    assert p_det["activo"] is True
    assert p_det["operable"] is False
    assert p_det["estado_vencimiento"] == "vencido"
    assert len(p_det["motivos_no_operables"]) == 1

    # 3) Elemento de limpieza vencido -> activo pero no operable
    el_venc = _crear_elemento(session, frecuencia_dias=5, dias_desde_ultimo_recambio=12)
    assert el_venc["activo"] is True
    assert el_venc["operable"] is False
    assert el_venc["estado_vencimiento"] == "vencido"
    assert len(el_venc["motivos_no_operables"]) == 1

    # 4) Documento con revisión vencida -> activo pero no operable
    persona_ok = _crear_persona()
    doc_venc = _crear_documento(persona_ok["id"], hoy - timedelta(days=2))
    assert doc_venc["activo"] is True
    assert doc_venc["operable"] is False
    assert doc_venc["estado_vencimiento"] == "vencido"
    assert len(doc_venc["motivos_no_operables"]) == 1


# =====================================================================
# CA 2: Baja bloqueada si operable con asociaciones, permitida si vencido,
# históricos nunca bloquean, reactivación solo si baja automática
# =====================================================================

def test_ca2_baja_equipo_operable_bloquea_y_vencido_permite_con_advertencias(session):
    hoy = date.today()
    sector_id = _crear_sector()
    persona = _crear_persona()
    elemento = _crear_elemento(session)
    eq = _crear_equipo(sector_id, frecuencia_dias=30, fecha_ultima=hoy)

    # Plan borrador + tarea activa que usa ese equipo
    plan = client.post(
        "/planes-poes/",
        json={"nombre": _uid("Plan"), "elaborado_por_id": persona["id"]},
    ).json()
    res_tarea = client.post(
        f"/planes-poes/{plan['id']}/tareas",
        json={
            "nombre": "Limpieza Balanza",
            "tipo_poes": "operacional",
            "frecuencia": "diaria",
            "equipo_id": eq["id"],
            "metodo": "Limpiar con paño húmedo",
            "elementos_limpieza": [{"elemento_limpieza_id": elemento["id"], "cantidad_requerida": 1}],
        },
    )
    assert res_tarea.status_code == 201, res_tarea.text

    # 1) Como está operable y asociado a tarea activa -> bloquea con 409 y lista asociaciones
    res_bloq = client.delete(f"/equipos/{eq['id']}")
    assert res_bloq.status_code == 409
    detail = res_bloq.json()["detail"]
    assert "asociaciones" in detail and len(detail["asociaciones"]) >= 1
    assert any(a["tipo"] == "tarea_poes" for a in detail["asociaciones"])

    # 2) Se vence la calibración -> ahora permite dar de baja, guarda motivo y devuelve advertencias
    eq_db = session.get(Equipo, eq["id"])
    eq_db.fecha_ultima_calibracion = hoy - timedelta(days=45)
    session.commit()

    res_ok = client.delete(f"/equipos/{eq['id']}", params={"motivo": "Fuera de servicio por calibración vencida"})
    assert res_ok.status_code == 200, res_ok.text
    baja = res_ok.json()
    assert baja["activo"] is False
    assert baja["tipo_baja"] == TipoBaja.MANUAL.value
    assert baja["motivo_baja"] == "Fuera de servicio por calibración vencida"
    assert len(baja["advertencias_asociaciones"]) >= 1


def test_ca2_asociaciones_historicas_no_bloquean_baja(session):
    hoy = date.today()
    sector_id = _crear_sector()
    persona = _crear_persona()
    elemento = _crear_elemento(session)
    eq = _crear_equipo(sector_id, frecuencia_dias=30, fecha_ultima=hoy)

    plan = client.post(
        "/planes-poes/",
        json={"nombre": _uid("PlanHist"), "elaborado_por_id": persona["id"]},
    ).json()
    client.post(
        f"/planes-poes/{plan['id']}/tareas",
        json={
            "nombre": "Limpieza Histórica",
            "tipo_poes": "operacional",
            "frecuencia": "diaria",
            "equipo_id": eq["id"],
            "metodo": "Limpiar con paño húmedo",
            "elementos_limpieza": [{"elemento_limpieza_id": elemento["id"], "cantidad_requerida": 1}],
        },
    )
    assert client.post(f"/planes-poes/{plan['id']}/activar").status_code == 200
    assert client.post(f"/planes-poes/{plan['id']}/archivar").status_code == 200

    # El plan está archivado (histórico) -> NO debe bloquear la baja del equipo ni del elemento
    assert client.delete(f"/equipos/{eq['id']}").status_code == 200
    assert client.delete(f"/elementos-limpieza/{elemento['id']}").status_code == 200


def test_ca2_reactivacion_manual_vs_automatica_al_renovar(session):
    hoy = date.today()
    sector_id = _crear_sector()

    # Caso A: baja manual -> calibrar NO reactiva automáticamente
    eq_manual = _crear_equipo(sector_id, frecuencia_dias=10, fecha_ultima=hoy - timedelta(days=20))
    assert client.delete(f"/equipos/{eq_manual['id']}").status_code == 200

    res_cal = client.post(
        f"/equipos/{eq_manual['id']}/calibraciones",
        data={"fecha_calibracion": hoy.isoformat()},
    )
    assert res_cal.status_code == 201, res_cal.text
    assert client.get(f"/equipos/{eq_manual['id']}").json()["activo"] is False

    # Caso B: baja automática por vencimiento -> calibrar SÍ reactiva automáticamente
    eq_auto = _crear_equipo(sector_id, frecuencia_dias=10, fecha_ultima=hoy - timedelta(days=20))
    eq_db = session.get(Equipo, eq_auto["id"])
    eq_db.activo = False
    eq_db.tipo_baja = TipoBaja.AUTOMATICA_VENCIMIENTO.value
    eq_db.motivo_baja = "Calibración vencida"
    eq_db.fecha_baja = datetime.now()
    session.commit()

    res_cal_auto = client.post(
        f"/equipos/{eq_auto['id']}/calibraciones",
        data={"fecha_calibracion": hoy.isoformat()},
    )
    assert res_cal_auto.status_code == 201, res_cal_auto.text
    eq_reactivado = client.get(f"/equipos/{eq_auto['id']}").json()
    assert eq_reactivado["activo"] is True
    assert eq_reactivado["operable"] is True
    assert eq_reactivado["tipo_baja"] is None


# =====================================================================
# CA 3: Bloqueos operativos y alertas con motivo/ruta en Plan, Checklist,
# Receta y Lote
# =====================================================================

def test_ca3_bloqueos_y_alertas_en_plan_poes_y_checklist(session):
    hoy = date.today()
    sector_id = _crear_sector()
    persona = _crear_persona()
    elemento_ok = _crear_elemento(session)
    eq_venc = _crear_equipo(sector_id, frecuencia_dias=10, fecha_ultima=hoy - timedelta(days=20))

    plan = client.post(
        "/planes-poes/",
        json={"nombre": _uid("PlanBloq"), "elaborado_por_id": persona["id"]},
    ).json()

    # 1) Crear tarea con equipo vencido -> bloqueado (409)
    res_crear = client.post(
        f"/planes-poes/{plan['id']}/tareas",
        json={
            "nombre": "Limpieza bloqueada",
            "tipo_poes": "operacional",
            "frecuencia": "diaria",
            "equipo_id": eq_venc["id"],
            "metodo": "Lavar bien con detergente",
            "elementos_limpieza": [{"elemento_limpieza_id": elemento_ok["id"], "cantidad_requerida": 1}],
        },
    )
    assert res_crear.status_code == 409

    # 2) Crear tarea con equipo vigente, activar plan, luego vencer el equipo
    eq_ok = _crear_equipo(sector_id, frecuencia_dias=30, fecha_ultima=hoy)
    res_t = client.post(
        f"/planes-poes/{plan['id']}/tareas",
        json={
            "nombre": "Limpieza operativa",
            "tipo_poes": "operacional",
            "frecuencia": "diaria",
            "equipo_id": eq_ok["id"],
            "metodo": "Lavar bien con detergente",
            "elementos_limpieza": [{"elemento_limpieza_id": elemento_ok["id"], "cantidad_requerida": 1}],
        },
    )
    assert res_t.status_code == 201, res_t.text
    assert client.post(f"/planes-poes/{plan['id']}/activar").status_code == 200

    # Vence el equipo mientras el plan ya está activo
    eq_db = session.get(Equipo, eq_ok["id"])
    eq_db.fecha_ultima_calibracion = hoy - timedelta(days=45)
    session.commit()

    # El checklist del día expone alertas_recursos con ruta al equipo afectado
    checklist_hoy = client.get("/checklists/hoy").json()
    ejec = next(e for e in checklist_hoy if e["tarea"]["id"] == res_t.json()["id"])
    assert len(ejec["alertas_recursos"]) == 1
    assert ejec["alertas_recursos"][0]["ruta"] == f"/equipos?detalle={eq_ok['id']}"

    # Intentar completar esa tarea del checklist -> bloqueado (409)
    res_comp = client.patch(
        f"/checklists/{ejec['id']}/completar",
        data={"datos": json.dumps({"operador_id": persona["id"], "consumos": []})},
    )
    assert res_comp.status_code == 409


def test_ca3_bloqueo_activar_receta_y_crear_lote_con_recurso_no_operable(session):
    hoy = date.today()
    sector_id = _crear_sector()
    eq = _crear_equipo(sector_id, frecuencia_dias=30, fecha_ultima=hoy)

    um = UnidadMedida(nombre=_uid("Gramos"), simbolo="g", tipo_magnitud="masa", disponible=True)
    session.add(um)
    session.flush()

    prod = Producto(
        nombre=_uid("PanTest"),
        descripcion="Pan artesanal",
        unidad_medida_id=um.id,
        activo=True,
    )
    ins = Insumo(
        nombre=_uid("Harina"),
        unidad_medida_id=um.id,
        categoria="materia prima",
        disponible=True,
    )
    session.add_all([prod, ins])
    session.flush()

    # Persona admin de la suite (DNI 40000000)
    admin = session.query(Persona).filter_by(dni="40000000").first()
    receta = Receta(
        codigo_receta=_uid("REC"),
        nombre_receta="Receta Test",
        producto_id=prod.id,
        rendimiento_estandar=1000,
        estado=EstadoReceta.BORRADOR,
        usuario_creador_id=admin.id,
    )
    session.add(receta)
    session.flush()

    paso = PasoReceta(
        receta_id=receta.id,
        numero_orden=1,
        titulo="Amasado",
        instrucciones="Mezclar todo en la amasadora",
        equipos=[PasoEquipo(equipo_id=eq["id"], cantidad=1)],
        insumos=[PasoInsumo(insumo_id=ins.id, cantidad_consumo_estimada=500.0)],
    )
    session.add(paso)
    session.commit()

    # 1) Se vence el equipo antes de activar la receta -> bloquea activación (409)
    eq_db = session.get(Equipo, eq["id"])
    eq_db.fecha_ultima_calibracion = hoy - timedelta(days=45)
    session.commit()

    res_act = client.post(f"/recetas/{receta.id}/activar")
    assert res_act.status_code == 409

    # El listado de recetas muestra la alerta con ruta al equipo
    recetas_list = client.get("/recetas/").json()
    rec_json = next(r for r in recetas_list if r["id"] == receta.id)
    assert any(a["ruta"] == f"/equipos?detalle={eq['id']}" for a in rec_json["alertas_recursos"])

    # 2) Calibramos el equipo -> activa receta -> luego volvemos a vencer el equipo -> bloquea crear lote (409)
    eq_db.fecha_ultima_calibracion = hoy
    session.commit()
    assert client.post(f"/recetas/{receta.id}/activar").status_code == 200

    eq_db.fecha_ultima_calibracion = hoy - timedelta(days=45)
    session.commit()

    res_lote = client.post(
        "/lotes/",
        json={
            "producto_id": prod.id,
            "fecha_elaboracion": datetime.now().isoformat(),
            "fecha_vencimiento": (hoy + timedelta(days=5)).isoformat(),
            "cantidad_producida": 1000,
            "consumos": [{"insumo_id": ins.id, "cantidad_real_utilizada": 500}],
        },
    )
    assert res_lote.status_code == 409