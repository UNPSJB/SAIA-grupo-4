from datetime import datetime, date, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from src.incidentes import schemas, exceptions
from src.incidentes.models import Incidente, HistorialIncidente
from src.personal.models import Persona
from src.tipo_incidente.models import TipoIncidente
from src.tipo_incidente.exceptions import TipoNoExiste, TipoInactivo

def crear_incidente(db: Session, incidente: schemas.IncidenteCreate) -> Incidente:

    reportante = db.scalar(
        select(Persona).where(
            Persona.id == incidente.reportante_id
        )
    )

    if reportante is None:
        raise exceptions.ReportanteNoEncontrado()

    tipo = db.scalar(
        select(TipoIncidente).where(
            TipoIncidente.id == incidente.tipo_id
        )
    )

    if tipo is None:
        raise TipoNoExiste()

    if not tipo.activo:
        raise TipoInactivo()

    _incidente = Incidente(**incidente.model_dump(), abierto=True)

    db.add(_incidente)
    try:
        db.commit()
        db.refresh(_incidente)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el incidente."
        )

    return _incidente

def listar_incidentes(db: Session) -> list[Incidente]:
    return db.scalars(select(Incidente)).all()

def obtener_incidente_por_id(db: Session, incidente_id: int) -> Incidente:
    incidente = db.scalar(
        select(Incidente)
        .options(
            selectinload(Incidente.reportante),
            selectinload(Incidente.responsable_cierre),
            selectinload(Incidente.tipo),
        )
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

# ESTO ES DE LA ESTADÍSTICA DEL TIPO
def _validar_rango(desde: date | None, hasta: date | None):
    if desde and hasta and desde > hasta:
        raise exceptions.RangosFechasInvalido()

def _aplicar_rango(query, desde: date | None, hasta: date | None):
    # fecha_hora_reporte es DateTime: "hasta" es inclusivo, por eso < hasta + 1 día
    if desde:
        query = query.where(Incidente.fecha_hora_reporte >= desde)
    if hasta:
        query = query.where(Incidente.fecha_hora_reporte < hasta + timedelta(days=1))
    return query

def listar_incidentes(
    db: Session,
    tipo_id: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
) -> list[Incidente]:
    _validar_rango(desde, hasta)

    query = select(Incidente).options(selectinload(Incidente.tipo))
    if tipo_id:
        query = query.where(Incidente.tipo_id == tipo_id)
    query = _aplicar_rango(query, desde, hasta)

    return db.scalars(query).all()

def obtener_estadisticas_por_tipo(
    db: Session, desde: date | None = None, hasta: date | None = None
) -> list[schemas.EstadisticaTipoIncidente]:
    _validar_rango(desde, hasta)

    cantidad = func.count(Incidente.id)
    query = (
        select(TipoIncidente.id, TipoIncidente.nombre, cantidad)
        .join(Incidente, Incidente.tipo_id == TipoIncidente.id)
    )
    query = _aplicar_rango(query, desde, hasta)

    filas = db.execute(
        query.group_by(TipoIncidente.id, TipoIncidente.nombre).order_by(cantidad.desc())
    ).all()

    return [
        schemas.EstadisticaTipoIncidente(tipo_id=i, tipo=n, cantidad=c)
        for i, n, c in filas
    ]