from datetime import datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from src.incidentes import schemas, exceptions
from src.incidentes.models import Incidente, HistorialIncidente
from src.personal.models import Persona

ESTADO_ABIERTO = "abierto"
ESTADO_CERRADO = "cerrado"

def obtener_incidente_por_id(db: Session, incidente_id: int) -> Incidente:
    incidente = db.scalar(
        select(Incidente)
        .options(
            selectinload(Incidente.reportante),
            selectinload(Incidente.responsable_cierre),
        )
        .where(Incidente.id == incidente_id)
    )
    if not incidente:
        raise exceptions.IncidenteNoEncontrado()
    return incidente


def validar_persona_existe(db: Session, persona_id: int) -> None:
    persona = db.scalar(select(Persona).where(Persona.id == persona_id))
    if not persona or not persona.activo:
        raise exceptions.ResponsableNoEncontrado()

def crear_incidente(db: Session, incidente: schemas.IncidenteCreate) -> Incidente:
    if incidente.reportante_id is None:
        raise exceptions.ReportanteNoAsignado()

    reportante = db.scalar(
        select(Persona).where(Persona.id == incidente.reportante_id)
    )
    if reportante is None:
        raise exceptions.ReportanteNoEncontrado()

    _incidente = Incidente(**incidente.model_dump(), abierto=True)

    db.add(_incidente)
    try:
        db.commit()
        db.refresh(_incidente)
    except IntegrityError:
        db.rollback()
        raise exceptions.IncidenteErrorIntegridad()
    return _incidente


def listar_incidentes(db: Session) -> list[Incidente]:
    return db.scalars(
        select(Incidente)
        .options(
            selectinload(Incidente.reportante),
            selectinload(Incidente.responsable_cierre),
        )
        .order_by(Incidente.fecha_hora_reporte.desc())
    ).all()


def cerrar_incidente(
    db: Session, incidente_id: int, datos: schemas.IncidenteCierreCreate
) -> Incidente:
    incidente = obtener_incidente_por_id(db, incidente_id)

    if not incidente.abierto:
        raise exceptions.IncidenteYaCerrado()

    validar_persona_existe(db, datos.responsable_cierre_id)

    ahora = datetime.now()

    incidente.abierto = False
    incidente.accion_correctiva = datos.accion_correctiva
    incidente.fecha_cierre = ahora
    incidente.responsable_cierre_id = datos.responsable_cierre_id

    historial = HistorialIncidente(
        incidente_id=incidente.id,
        estado_anterior=ESTADO_ABIERTO,
        estado_nuevo=ESTADO_CERRADO,
        motivo=datos.accion_correctiva,
        fecha=ahora,
        responsable_id=datos.responsable_cierre_id,
    )

    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente


def reabrir_incidente(
    db: Session, incidente_id: int, datos: schemas.IncidenteReaperturaCreate
) -> Incidente:
    incidente = obtener_incidente_por_id(db, incidente_id)

    if incidente.abierto:
        raise exceptions.IncidenteYaAbierto()

    validar_persona_existe(db, datos.responsable_id)

    ahora = datetime.now()

    incidente.abierto = True
    incidente.accion_correctiva = None
    incidente.fecha_cierre = None
    incidente.responsable_cierre_id = None

    historial = HistorialIncidente(
        incidente_id=incidente.id,
        estado_anterior=ESTADO_CERRADO,
        estado_nuevo=ESTADO_ABIERTO,
        motivo=datos.motivo,
        fecha=ahora,
        responsable_id=datos.responsable_id,
    )

    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente


def listar_historial_incidente(db: Session, incidente_id: int) -> list[HistorialIncidente]:
    obtener_incidente_por_id(db, incidente_id)  # Valida existencia

    return db.scalars(
        select(HistorialIncidente)
        .options(selectinload(HistorialIncidente.responsable))
        .where(HistorialIncidente.incidente_id == incidente_id)
        .order_by(HistorialIncidente.fecha.desc(), HistorialIncidente.id.desc())
    ).all()