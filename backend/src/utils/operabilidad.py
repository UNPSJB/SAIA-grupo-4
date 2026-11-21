from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import inspect, text, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from src.exceptions import Conflict

class EstadoVencimientoOperabilidad(str, Enum):
    VIGENTE = "vigente"
    PROXIMO = "proximo"
    VENCIDO = "vencido"
    SIN_CONFIGURAR = "sin_configurar"


class TipoBaja(str, Enum):
    MANUAL = "manual"
    AUTOMATICA_VENCIMIENTO = "automatica_vencimiento"


class AsociacionOperativa(BaseModel):
    tipo: str
    id: int
    nombre: str
    detalle: Optional[str] = None
    ruta: Optional[str] = None


class AlertaRecursoNoOperable(BaseModel):
    tipo: str
    id: int
    nombre: str
    estado_vencimiento: EstadoVencimientoOperabilidad
    motivos: list[str]
    ruta: str


@dataclass(frozen=True)
class EstadoOperabilidad:
    operable: bool
    estado_vencimiento: EstadoVencimientoOperabilidad
    motivos_no_operables: list[str] = field(default_factory=list)


# Umbrales de aviso idénticos a los definidos en cada módulo
DIAS_AVISO_EQUIPO = 15
DIAS_AVISO_PERSONAL = 15
DIAS_AVISO_DOCUMENTO = 15
DIAS_AVISO_ELEMENTO = 3


def _fmt_fecha(fecha: date) -> str:
    return fecha.strftime("%d/%m/%Y")


def _motivo_inactivo(etiqueta: str, obj) -> str:
    tipo_baja = getattr(obj, "tipo_baja", None)
    motivo_baja = (getattr(obj, "motivo_baja", None) or "").strip()
    if tipo_baja == TipoBaja.AUTOMATICA_VENCIMIENTO.value:
        base = f"{etiqueta} dado de baja automáticamente por vencimiento"
    else:
        base = f"{etiqueta} dado de baja"
    return f"{base}: {motivo_baja}" if motivo_baja else f"{base}."


def evaluar_equipo(equipo, hoy: date | None = None) -> EstadoOperabilidad:
    ref = hoy or date.today()
    motivos: list[str] = []

    frecuencia = getattr(equipo, "frecuencia_calibracion_dias", None)
    fecha_ultima = getattr(equipo, "fecha_ultima_calibracion", None)

    if frecuencia and frecuencia > 0 and fecha_ultima:
        proxima = fecha_ultima + timedelta(days=frecuencia)
        dias = (proxima - ref).days
        if dias < 0:
            estado = EstadoVencimientoOperabilidad.VENCIDO
            motivos.append(f"Calibración vencida el {_fmt_fecha(proxima)}.")
        elif dias <= DIAS_AVISO_EQUIPO:
            estado = EstadoVencimientoOperabilidad.PROXIMO
        else:
            estado = EstadoVencimientoOperabilidad.VIGENTE
    else:
        estado = EstadoVencimientoOperabilidad.SIN_CONFIGURAR

    if not equipo.activo:
        motivos.insert(0, _motivo_inactivo("Equipo", equipo))

    operable = bool(equipo.activo) and estado != EstadoVencimientoOperabilidad.VENCIDO
    return EstadoOperabilidad(
        operable=operable,
        estado_vencimiento=estado,
        motivos_no_operables=motivos,
    )


def evaluar_persona(persona, hoy: date | None = None) -> EstadoOperabilidad:
    ref = hoy or date.today()
    motivos: list[str] = []

    vencimientos = getattr(persona, "vencimientos", None) or []
    vencimientos_activos = [
        v for v in vencimientos if getattr(v, "documento", None) is None or v.documento.activo
    ]

    if not vencimientos_activos:
        estado = EstadoVencimientoOperabilidad.SIN_CONFIGURAR
    else:
        tiene_vencido = False
        tiene_proximo = False
        for v in sorted(vencimientos_activos, key=lambda item: item.fecha_vencimiento):
            dias = (v.fecha_vencimiento - ref).days
            if dias < 0:
                tiene_vencido = True
                nombre_doc = v.documento.nombre if getattr(v, "documento", None) else "Documento"
                motivos.append(
                    f"Documentación vencida: {nombre_doc} (venció el {_fmt_fecha(v.fecha_vencimiento)})."
                )
            elif dias <= DIAS_AVISO_PERSONAL:
                tiene_proximo = True

        if tiene_vencido:
            estado = EstadoVencimientoOperabilidad.VENCIDO
        elif tiene_proximo:
            estado = EstadoVencimientoOperabilidad.PROXIMO
        else:
            estado = EstadoVencimientoOperabilidad.VIGENTE

    if not persona.activo:
        motivos.insert(0, _motivo_inactivo("Personal", persona))

    operable = bool(persona.activo) and estado != EstadoVencimientoOperabilidad.VENCIDO
    return EstadoOperabilidad(
        operable=operable,
        estado_vencimiento=estado,
        motivos_no_operables=motivos,
    )


def evaluar_elemento_limpieza(elemento, hoy: date | None = None) -> EstadoOperabilidad:
    ref = hoy or date.today()
    motivos: list[str] = []

    frecuencia = getattr(elemento, "frecuencia_recambio_dias", None)
    fecha_ultimo = getattr(elemento, "fecha_ultimo_recambio", None)

    if frecuencia and frecuencia > 0 and fecha_ultimo:
        fecha_base = (
            fecha_ultimo.date() if isinstance(fecha_ultimo, datetime) else fecha_ultimo
        )
        proxima = fecha_base + timedelta(days=frecuencia)
        dias = (proxima - ref).days
        if dias < 0:
            estado = EstadoVencimientoOperabilidad.VENCIDO
            motivos.append(f"Recambio vencido el {_fmt_fecha(proxima)}.")
        elif dias <= DIAS_AVISO_ELEMENTO:
            estado = EstadoVencimientoOperabilidad.PROXIMO
        else:
            estado = EstadoVencimientoOperabilidad.VIGENTE
    else:
        estado = EstadoVencimientoOperabilidad.SIN_CONFIGURAR

    if not elemento.activo:
        motivos.insert(0, _motivo_inactivo("Elemento de limpieza", elemento))

    operable = bool(elemento.activo) and estado != EstadoVencimientoOperabilidad.VENCIDO
    return EstadoOperabilidad(
        operable=operable,
        estado_vencimiento=estado,
        motivos_no_operables=motivos,
    )


def evaluar_documento(documento, hoy: date | None = None) -> EstadoOperabilidad:
    ref = hoy or date.today()
    motivos: list[str] = []

    version_vigente = getattr(documento, "version_vigente", None)
    fecha_rev = (
        getattr(version_vigente, "fecha_proxima_revision", None)
        if version_vigente
        else None
    )

    if fecha_rev is not None:
        dias = (fecha_rev - ref).days
        if dias < 0:
            estado = EstadoVencimientoOperabilidad.VENCIDO
            motivos.append(f"Revisión documental vencida el {_fmt_fecha(fecha_rev)}.")
        elif dias <= DIAS_AVISO_DOCUMENTO:
            estado = EstadoVencimientoOperabilidad.PROXIMO
        else:
            estado = EstadoVencimientoOperabilidad.VIGENTE
    else:
        estado = EstadoVencimientoOperabilidad.SIN_CONFIGURAR

    if not documento.activo:
        motivos.insert(0, _motivo_inactivo("Documento", documento))

    operable = bool(documento.activo) and estado != EstadoVencimientoOperabilidad.VENCIDO
    return EstadoOperabilidad(
        operable=operable,
        estado_vencimiento=estado,
        motivos_no_operables=motivos,
    )


def asegurar_columnas_baja_logica(engine: Engine) -> None:
    """Agrega de forma idempotente las columnas de baja en bases SQLite ya existentes."""
    tablas = ("equipos", "personal", "elementos_limpieza", "documentos")
    columnas_requeridas = (
        ("tipo_baja", "VARCHAR(40)"),
        ("motivo_baja", "VARCHAR(255)"),
        ("fecha_baja", "DATETIME"),
    )
    inspector = inspect(engine)
    tablas_existentes = set(inspector.get_table_names())

    with engine.begin() as conn:
        for tabla in tablas:
            if tabla not in tablas_existentes:
                continue
            existentes = {col["name"] for col in inspector.get_columns(tabla)}
            for nombre_col, tipo_sql in columnas_requeridas:
                if nombre_col not in existentes:
                    conn.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {nombre_col} {tipo_sql}"))

class RecursoConAsociacionesActivas(Conflict):
    def __init__(self, mensaje: str, asociaciones: list[AsociacionOperativa]) -> None:
        super().__init__(
            detail={
                "code": mensaje,
                "asociaciones": [a.model_dump() for a in asociaciones],
            }
        )


def registrar_baja_logica(
    obj,
    *,
    tipo_baja: TipoBaja = TipoBaja.MANUAL,
    motivo: str | None = None,
) -> None:
    obj.activo = False
    obj.tipo_baja = tipo_baja.value
    obj.motivo_baja = (motivo or "").strip() or None
    obj.fecha_baja = datetime.now()


def limpiar_datos_baja(obj) -> None:
    obj.tipo_baja = None
    obj.motivo_baja = None
    obj.fecha_baja = None


def intentar_reactivacion_automatica(
    obj,
    estado_vencimiento: EstadoVencimientoOperabilidad,
) -> bool:
    """Solo reactiva si la baja fue automática por vencimiento y el recurso dejó de estar vencido."""
    if obj.activo:
        return False
    if getattr(obj, "tipo_baja", None) != TipoBaja.AUTOMATICA_VENCIMIENTO.value:
        return False
    if estado_vencimiento == EstadoVencimientoOperabilidad.VENCIDO:
        return False

    obj.activo = True
    limpiar_datos_baja(obj)
    return True


def obtener_asociaciones_equipo(db: Session, equipo_id: int) -> list[AsociacionOperativa]:
    """Devuelve solo asociaciones operativas activas (las recetas inhabilitadas y planes archivados no bloquean)."""
    from src.elementos_limpieza.models import ElementoLimpieza
    from src.insumo_quimico.models import InsumoQuimico
    from src.plan_poes.models import PlanPOES, TareaPOES
    from src.recetas.constants import EstadoReceta
    from src.recetas.models import PasoEquipo, PasoReceta, Receta

    asociaciones: list[AsociacionOperativa] = []

    recetas = db.scalars(
        select(Receta)
        .join(PasoReceta, PasoReceta.receta_id == Receta.id)
        .join(PasoEquipo, PasoEquipo.paso_id == PasoReceta.id)
        .where(
            PasoEquipo.equipo_id == equipo_id,
            Receta.estado.in_([EstadoReceta.ACTIVA, EstadoReceta.BORRADOR]),
        )
        .distinct()
    ).all()
    for r in recetas:
        estado_txt = r.estado.value if hasattr(r.estado, "value") else str(r.estado)
        asociaciones.append(
            AsociacionOperativa(
                tipo="receta",
                id=r.id,
                nombre=f"{r.codigo_receta} - {r.nombre_receta}",
                detalle=f"Receta en estado {estado_txt}",
                ruta=f"/recetas/{r.id}/ficha-tecnica",
            )
        )

    tareas = db.scalars(
        select(TareaPOES)
        .join(PlanPOES, TareaPOES.plan_id == PlanPOES.id)
        .where(
            TareaPOES.equipo_id == equipo_id,
            TareaPOES.activo.is_(True),
            PlanPOES.fecha_hasta.is_(None),
        )
    ).all()
    for t in tareas:
        es_vigente = bool(t.plan and t.plan.activo)
        asociaciones.append(
            AsociacionOperativa(
                tipo="tarea_poes",
                id=t.id,
                nombre=t.nombre,
                detalle=f"Plan POES {'vigente' if es_vigente else 'borrador'}",
                ruta="/plan-poes" if es_vigente else "/nuevo-plan",
            )
        )

    elementos = db.scalars(
        select(ElementoLimpieza).where(
            ElementoLimpieza.equipo_id == equipo_id,
            ElementoLimpieza.activo.is_(True),
        )
    ).all()
    for el in elementos:
        asociaciones.append(
            AsociacionOperativa(
                tipo="elemento_limpieza",
                id=el.id,
                nombre=el.nombre,
                detalle="Elemento de limpieza activo asignado al equipo",
                ruta=f"/elementos-limpieza?detalle={el.id}",
            )
        )

    insumos_q = db.scalars(
        select(InsumoQuimico).where(
            InsumoQuimico.equipo_id == equipo_id,
            InsumoQuimico.activo.is_(True),
        )
    ).all()
    for iq in insumos_q:
        asociaciones.append(
            AsociacionOperativa(
                tipo="insumo_quimico",
                id=iq.id,
                nombre=iq.nombre,
                detalle="Insumo químico activo asignado al equipo",
                ruta="/insumos-quimicos",
            )
        )

    return asociaciones


def obtener_asociaciones_elemento_limpieza(
    db: Session, elemento_id: int
) -> list[AsociacionOperativa]:
    """Devuelve tareas activas en planes POES no archivados que usan el elemento."""
    from src.plan_poes.models import PlanPOES, TareaElementoLimpieza, TareaPOES

    tareas = db.scalars(
        select(TareaPOES)
        .join(TareaElementoLimpieza, TareaElementoLimpieza.tarea_id == TareaPOES.id)
        .join(PlanPOES, TareaPOES.plan_id == PlanPOES.id)
        .where(
            TareaElementoLimpieza.elemento_limpieza_id == elemento_id,
            TareaPOES.activo.is_(True),
            PlanPOES.fecha_hasta.is_(None),
        )
        .distinct()
    ).all()

    asociaciones: list[AsociacionOperativa] = []
    for t in tareas:
        es_vigente = bool(t.plan and t.plan.activo)
        asociaciones.append(
            AsociacionOperativa(
                tipo="tarea_poes",
                id=t.id,
                nombre=t.nombre,
                detalle=f"Plan POES {'vigente' if es_vigente else 'borrador'}",
                ruta="/plan-poes" if es_vigente else "/nuevo-plan",
            )
        )
    return asociaciones


def obtener_asociaciones_persona(db: Session, persona_id: int) -> list[AsociacionOperativa]:
    """Devuelve asociaciones operativas activas de la persona (históricos nunca bloquean)."""
    from src.checklists.constants import EstadoEjecucion
    from src.checklists.models import EjecucionTarea
    from src.plan_poes.models import PlanPOES

    asociaciones: list[AsociacionOperativa] = []

    planes_vigentes = db.scalars(
        select(PlanPOES).where(
            PlanPOES.elaborado_por_id == persona_id,
            PlanPOES.activo.is_(True),
        )
    ).all()
    for plan in planes_vigentes:
        asociaciones.append(
            AsociacionOperativa(
                tipo="plan_poes",
                id=plan.id,
                nombre=plan.nombre,
                detalle="Plan POES vigente elaborado por esta persona",
                ruta="/plan-poes",
            )
        )

    ejecuciones_pendientes = db.scalars(
        select(EjecucionTarea).where(
            EjecucionTarea.operador_id == persona_id,
            EjecucionTarea.estado == EstadoEjecucion.PENDIENTE,
        )
    ).all()
    for ej in ejecuciones_pendientes:
        asociaciones.append(
            AsociacionOperativa(
                tipo="checklist",
                id=ej.id,
                nombre=ej.tarea.nombre if ej.tarea else f"Ejecución #{ej.id}",
                detalle="Tarea pendiente en checklist",
                ruta="/checklist",
            )
        )

    return asociaciones


def obtener_asociaciones_documento(db: Session, documento_id: int) -> list[AsociacionOperativa]:
    """Los documentos no tienen tablas dependientes operativas en el modelo actual."""
    return []
class RecursoNoOperable(Conflict):
    def __init__(self, mensaje: str, recursos: list[AlertaRecursoNoOperable]) -> None:
        super().__init__(
            detail={
                "code": mensaje,
                "recursos": [r.model_dump() for r in recursos],
            }
        )


def _deduplicar_alertas(
    alertas: list[AlertaRecursoNoOperable],
) -> list[AlertaRecursoNoOperable]:
    vistos: set[tuple[str, int]] = set()
    resultado: list[AlertaRecursoNoOperable] = []
    for alerta in alertas:
        clave = (alerta.tipo, alerta.id)
        if clave not in vistos:
            vistos.add(clave)
            resultado.append(alerta)
    return resultado


def alerta_desde_equipo(equipo) -> AlertaRecursoNoOperable | None:
    estado = evaluar_equipo(equipo)
    if estado.operable:
        return None
    return AlertaRecursoNoOperable(
        tipo="equipo",
        id=equipo.id,
        nombre=equipo.nombre,
        estado_vencimiento=estado.estado_vencimiento,
        motivos=estado.motivos_no_operables,
        ruta=f"/equipos?detalle={equipo.id}",
    )


def alerta_desde_persona(persona) -> AlertaRecursoNoOperable | None:
    estado = evaluar_persona(persona)
    if estado.operable:
        return None
    return AlertaRecursoNoOperable(
        tipo="personal",
        id=persona.id,
        nombre=f"{persona.nombre} {persona.apellido}".strip(),
        estado_vencimiento=estado.estado_vencimiento,
        motivos=estado.motivos_no_operables,
        ruta=f"/personal?detalle={persona.id}",
    )


def alerta_desde_elemento(elemento) -> AlertaRecursoNoOperable | None:
    estado = evaluar_elemento_limpieza(elemento)
    if estado.operable:
        return None
    return AlertaRecursoNoOperable(
        tipo="elemento_limpieza",
        id=elemento.id,
        nombre=elemento.nombre,
        estado_vencimiento=estado.estado_vencimiento,
        motivos=estado.motivos_no_operables,
        ruta=f"/elementos-limpieza?detalle={elemento.id}",
    )


def alerta_desde_documento(documento) -> AlertaRecursoNoOperable | None:
    estado = evaluar_documento(documento)
    if estado.operable:
        return None
    return AlertaRecursoNoOperable(
        tipo="documento",
        id=documento.id,
        nombre=documento.titulo,
        estado_vencimiento=estado.estado_vencimiento,
        motivos=estado.motivos_no_operables,
        ruta=f"/documentos?detalle={documento.id}",
    )


def alertas_de_tarea_poes(tarea) -> list[AlertaRecursoNoOperable]:
    alertas: list[AlertaRecursoNoOperable] = []
    if getattr(tarea, "equipo", None) is not None:
        alerta = alerta_desde_equipo(tarea.equipo)
        if alerta:
            alertas.append(alerta)
    for rel in getattr(tarea, "elementos_limpieza", None) or []:
        elemento = getattr(rel, "elemento_limpieza", None)
        if elemento is not None:
            alerta = alerta_desde_elemento(elemento)
            if alerta:
                alertas.append(alerta)
    return _deduplicar_alertas(alertas)


def alertas_de_plan_poes(plan) -> list[AlertaRecursoNoOperable]:
    alertas: list[AlertaRecursoNoOperable] = []
    if getattr(plan, "elaborado_por", None) is not None:
        alerta = alerta_desde_persona(plan.elaborado_por)
        if alerta:
            alertas.append(alerta)
    for tarea in getattr(plan, "tareas", None) or []:
        if getattr(tarea, "activo", True):
            alertas.extend(alertas_de_tarea_poes(tarea))
    return _deduplicar_alertas(alertas)


def alertas_de_ejecucion_checklist(ejecucion) -> list[AlertaRecursoNoOperable]:
    alertas: list[AlertaRecursoNoOperable] = []
    if getattr(ejecucion, "tarea", None) is not None:
        alertas.extend(alertas_de_tarea_poes(ejecucion.tarea))
    if getattr(ejecucion, "operador", None) is not None:
        alerta = alerta_desde_persona(ejecucion.operador)
        if alerta:
            alertas.append(alerta)
    return _deduplicar_alertas(alertas)


def alertas_de_receta(receta) -> list[AlertaRecursoNoOperable]:
    alertas: list[AlertaRecursoNoOperable] = []
    for paso in getattr(receta, "pasos", None) or []:
        for rel in getattr(paso, "equipos", None) or []:
            equipo = getattr(rel, "equipo", None)
            if equipo is not None:
                alerta = alerta_desde_equipo(equipo)
                if alerta:
                    alertas.append(alerta)
    return _deduplicar_alertas(alertas)


def alertas_de_lote(lote) -> list[AlertaRecursoNoOperable]:
    alertas: list[AlertaRecursoNoOperable] = []
    if getattr(lote, "operador", None) is not None:
        alerta = alerta_desde_persona(lote.operador)
        if alerta:
            alertas.append(alerta)
    if getattr(lote, "receta", None) is not None:
        alertas.extend(alertas_de_receta(lote.receta))
    return _deduplicar_alertas(alertas)