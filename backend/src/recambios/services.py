from datetime import date, datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.recambios.models import Recambio
from src.recambios import schemas, exceptions
from src.recambios.constants import Constantes, EstadoRecambio
from src.elementos_limpieza.models import ElementoLimpieza
from src.elementos_limpieza.services import leer_elemento_limpieza


def calcular_estado(ultimo: date, frecuencia_dias: int, hoy: date) -> tuple[date, int, EstadoRecambio]:
    """Regla de semaforización: función pura, no depende de la base ni de la API.

    Devuelve (proxima_fecha, dias_restantes, estado).
    """
    proxima_fecha = ultimo + timedelta(days=frecuencia_dias)
    dias_restantes = (proxima_fecha - hoy).days
    if dias_restantes < 0:
        estado = EstadoRecambio.VENCIDO
    elif dias_restantes <= Constantes.DIAS_AVISO_PROXIMO:
        estado = EstadoRecambio.PROXIMO
    else:
        estado = EstadoRecambio.AL_DIA
    return proxima_fecha, dias_restantes, estado


def listar_alertas(db: Session) -> list[schemas.AlertaRecambio]:
    elementos = db.scalars(
        select(ElementoLimpieza).where(
            ElementoLimpieza.activo == True,
            ElementoLimpieza.frecuencia_recambio_dias.is_not(None),
            ElementoLimpieza.fecha_ultimo_recambio.is_not(None),
        )
    ).all()

    hoy = date.today()
    alertas = []
    for elemento in elementos:
        proxima_fecha, dias_restantes, estado = calcular_estado(
            elemento.fecha_ultimo_recambio.date(), elemento.frecuencia_recambio_dias, hoy
        )
        alertas.append(schemas.AlertaRecambio(
            elemento=elemento,
            proxima_fecha=proxima_fecha,
            dias_restantes=dias_restantes,
            estado=estado,
        ))
    # Lo más urgente primero
    alertas.sort(key=lambda a: a.dias_restantes)
    return alertas


def _validar_fecha_no_anterior(db: Session, elemento, fecha: date) -> None:
    # Se compara contra el historial y no contra elemento.fecha_ultimo_recambio,
    # porque ese campo toma la fecha de alta del elemento por defecto
    ultimo = db.scalar(
        select(func.max(Recambio.fecha_recambio)).where(Recambio.elemento_id == elemento.id)
    )
    if ultimo is not None and fecha < ultimo.date():
        raise exceptions.FechaAnterior()


def registrar_recambio(db: Session, datos: schemas.RecambioCreate) -> schemas.Recambio:
    db_elemento = leer_elemento_limpieza(db, datos.elemento_id)
    if not db_elemento.activo:
        raise exceptions.ElementoInactivo()
    if db_elemento.frecuencia_recambio_dias is None:
        raise exceptions.SinFrecuencia()

    fecha = datos.fecha_recambio or date.today()
    if fecha > date.today():
        raise exceptions.FechaFutura()
    _validar_fecha_no_anterior(db, db_elemento, fecha)

    fecha_dt = datetime.combine(fecha, datetime.min.time())
    db_recambio = Recambio(
        elemento_id=db_elemento.id,
        fecha_recambio=fecha_dt,
        observaciones=datos.observaciones,
    )
    db.add(db_recambio)
    db_elemento.fecha_ultimo_recambio = fecha_dt
    # Un solo commit: historial y elemento se guardan juntos o no se guarda ninguno
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_recambio)
    return db_recambio


def listar_historial(db: Session, elemento_id: int) -> list[schemas.Recambio]:
    # Valida que el elemento exista (404 si no). Se permite ver el historial
    # de elementos dados de baja.
    leer_elemento_limpieza(db, elemento_id)
    return db.scalars(
        select(Recambio)
        .where(Recambio.elemento_id == elemento_id)
        .order_by(Recambio.fecha_recambio.desc(), Recambio.id.desc())
    ).all()
