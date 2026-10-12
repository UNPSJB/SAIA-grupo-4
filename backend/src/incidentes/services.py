from datetime import datetime, date, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from src.incidentes import schemas, exceptions
from src.incidentes.models import Incidente, HistorialIncidente
from src.personal.models import Persona
from src.tipo_incidente.models import TipoIncidente
from src.tipo_incidente.exceptions import TipoNoExiste, TipoInactivo
from fastapi import UploadFile
from pathlib import Path
import os
import shutil
import uuid
import re

ESTADO_ABIERTO = "abierto"
ESTADO_CERRADO = "cerrado"

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "incidentes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

UPLOAD_URL_PREFIX = "uploads/incidentes"

EXTENSIONES_POR_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

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

def crear_incidente(db: Session, incidente: schemas.IncidenteCreate, foto: UploadFile | None = None, ) -> Incidente:

    reportante = db.scalar(
        select(Persona).where(Persona.id == incidente.reportante_id)
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

    # Validaciones de la foto
    foto_url = None

    if foto is not None:
        if not foto.content_type or not foto.content_type.startswith("image/"):
            raise exceptions.ArchivoInvalido()

        # Preparo un titulo para la imagen cuando la guarde
        titulo_seguro = re.sub(
            r"[^a-zA-Z0-9_-]",
            "_",
            incidente.titulo,
        ).strip("_")[:40] or "Incidente"

        # Preparo la fecha para sumarla al titulo de la imagen
        fecha = incidente.fecha_hora_reporte.strftime("%Y%m%d_%H%M%S_%f")

        # Preparo la extension de la imagen
        content_type = (foto.content_type or "").lower().strip()
        extension = EXTENSIONES_POR_CONTENT_TYPE.get(content_type)

        if extension is None:
            raise exceptions.ArchivoInvalido()

        # Genero un sufijo por si el titulo y la fecha y hora del incidente son iguales
        sufijo = uuid.uuid4().hex

        # Preparo el nombre de la imagen
        nombre_archivo = f"{titulo_seguro}_{fecha}_{sufijo}{extension}"
        # Ej: Moscas_20261010_003918_457000_a1b2c3....jpg

        ruta_archivo = UPLOAD_DIR / nombre_archivo

        with ruta_archivo.open("wb") as destino:
            shutil.copyfileobj(foto.file, destino)
        
        foto_url = f"{UPLOAD_URL_PREFIX}/{nombre_archivo}"

    _incidente = Incidente(**incidente.model_dump(exclude={"foto_url"}),foto_url=foto_url, abierto=True)

    db.add(_incidente)
    try:
        db.commit()
        db.refresh(_incidente)
    except IntegrityError:
        db.rollback()
        raise exceptions.IncidenteErrorIntegridad()
    return _incidente


def listar_incidentes_por_reportante(db: Session, reportante_id: int) -> list[Incidente]:
    return db.scalars(
        select(Incidente)
        .where(Incidente.reportante_id == reportante_id)
        .order_by(
            Incidente.fecha_hora_reporte.asc(),
            Incidente.id.asc(),
        )
    ).all()

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

def listar_incidentes_abiertos(db: Session) -> list[Incidente]:
    return db.scalars(
        select(Incidente).where(
            Incidente.abierto.is_(True), # lista solo los incidentes que esten abiertos
        ).order_by(
            Incidente.fecha_hora_reporte.asc(), # ordena del mas viejo al mas nuevo
            Incidente.id.asc(), # ordena por id del menor al mayor si es que la fecha coincide
        )
    ).all()

def listar_incidentes_cerrados(db: Session) -> list[Incidente]:
    return db.scalars(
        select(Incidente).where(
            Incidente.abierto.is_(False), # lista solo los incidentes que esten cerrados
        ).order_by(
            Incidente.fecha_hora_reporte.asc(), # ordena del mas viejo al mas nuevo
            Incidente.id.asc(), # ordena por id del menor al mayor si es que la fecha coincide
        )
    ).all()

def listar_incidentes_abiertos_por_tipo(db: Session) -> list[schemas.IncidentesAbiertosPorTipo]:
    cantidad = func.count(Incidente.id)
    filas = db.execute(
        select(TipoIncidente.id, TipoIncidente.nombre, cantidad)
        .join(Incidente, Incidente.tipo_id == TipoIncidente.id)
        .where(Incidente.abierto.is_(True))
        .group_by(TipoIncidente.id, TipoIncidente.nombre)
        .order_by(TipoIncidente.nombre.asc())
    ).all()
    return [
        schemas.IncidentesAbiertosPorTipo(tipo_id=tipo_id, tipo=tipo, cantidad=total)
        for tipo_id, tipo, total in filas
    ]

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