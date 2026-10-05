from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.incidentes import schemas, exceptions
from src.incidentes.models import Incidente, HistorialIncidente
from src.personal.models import Persona

def obtener_incidente_por_id(db: Session, incidente_id: int) -> Incidente:
    incidente = db.scalar(
        select(Incidente)
        .options(selectinload(Incidente.reportante), selectinload(Incidente.responsable_cierre))
        .where(Incidente.id == incidente_id)
    )
    if not incidente:
        raise exceptions.IncidenteNoEncontrado()
    return incidente

def validar_persona_existe(db: Session, persona_id: int):
    persona = db.scalar(select(Persona).where(Persona.id == persona_id))
    if not persona:
        raise exceptions.ResponsableNoEncontrado()

def cerrar_incidente(db: Session, incidente_id: int, datos: schemas.IncidenteCierreCreate) -> Incidente:
    incidente = obtener_incidente_por_id(db, incidente_id)

    if not incidente.abierto:
        raise exceptions.IncidenteYaCerrado()

    validar_persona_existe(db, datos.responsable_cierre_id)

    ahora = datetime.now()

    # 1. Actualizar estado del incidente
    incidente.abierto = False
    incidente.accion_correctiva = datos.accion_correctiva
    incidente.fecha_cierre = ahora
    incidente.responsable_cierre_id = datos.responsable_cierre_id

    # 2. Registrar en el historial
    historial = HistorialIncidente(
        incidente_id=incidente.id,
        estado_anterior="abierto",
        estado_nuevo="cerrado",
        motivo=datos.accion_correctiva,
        fecha=ahora,
        responsable_id=datos.responsable_cierre_id
    )

    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente

def reabrir_incidente(db: Session, incidente_id: int, datos: schemas.IncidenteReaperturaCreate) -> Incidente:
    incidente = obtener_incidente_por_id(db, incidente_id)

    if incidente.abierto:
        raise exceptions.IncidenteYaAbierto()

    validar_persona_existe(db, datos.responsable_id)

    ahora = datetime.now()

    # 1. Actualizar estado del incidente
    incidente.abierto = True

    # 2. Registrar en el historial
    historial = HistorialIncidente(
        incidente_id=incidente.id,
        estado_anterior="cerrado",
        estado_nuevo="abierto",
        motivo=datos.motivo,
        fecha=ahora,
        responsable_id=datos.responsable_id
    )

    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente

def listar_historial_incidente(db: Session, incidente_id: int) -> list[HistorialIncidente]:
    obtener_incidente_por_id(db, incidente_id) # Valida existencia

    return db.scalars(
        select(HistorialIncidente)
        .options(selectinload(HistorialIncidente.responsable))
        .where(HistorialIncidente.incidente_id == incidente_id)
        .order_by(HistorialIncidente.fecha.desc())
    ).all()