from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.insumos.models import Insumo
from src.insumos.exceptions import InsumoNoExiste
from src.lotes_insumo.models import LoteInsumo
from src.lotes_insumo import schemas, exceptions
from datetime import datetime


# operaciones CRUD para LoteInsumo

def crear_lote_insumo(db: Session, lote: schemas.LoteInsumoCreate) -> schemas.LoteInsumo:
    # Verifica que el insumo exista y este disponible
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == lote.insumo_id))
    if db_insumo is None:
        raise InsumoNoExiste()
    if not db_insumo.disponible:
        raise exceptions.InsumoNoDisponible()

    # Crea el lote (queda activo por defecto) y lo sube a la db
    db_lote = LoteInsumo(**lote.model_dump())
    db.add(db_lote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_lote)
    return db_lote


def leer_lote_insumo(db: Session, lote_id: int) -> schemas.LoteInsumo:
    # Verificamos que el lote exista en la base
    db_lote = db.scalar(select(LoteInsumo).where(LoteInsumo.id == lote_id))
    if not db_lote:
        raise exceptions.LoteNoExiste()

    return db_lote


def listar_lotes_insumo(
    db: Session,
    insumo_id: int | None = None,
    activo: bool | None = None,
):
    consulta = select(LoteInsumo)

    if insumo_id is not None:
        consulta = consulta.where(LoteInsumo.insumo_id == insumo_id)

    if activo is not None:
        consulta = consulta.where(LoteInsumo.activo.is_(activo))

    return db.scalars(consulta).all()


def modificar_lote_insumo(db: Session, lote_id: int, lote: schemas.LoteInsumoUpdate) -> schemas.LoteInsumo:
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()

    update_data = lote.model_dump(exclude_unset=True)

    if update_data:
        db.execute(update(LoteInsumo).where(LoteInsumo.id == lote_id).values(**update_data))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_lote)
    return db_lote


def eliminar_lote_insumo(db: Session, lote_id: int) -> schemas.LoteInsumo:
    # Baja logica: el lote no se borra, queda inactivo
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()

    db.execute(update(LoteInsumo).where(LoteInsumo.id == lote_id).values(activo=False))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()

    db.refresh(db_lote)
    return db_lote

def inhabilitar_lote_insumo(
    db: Session,
    lote_id: int,
    datos: schemas.LoteInsumoInhabilitar,
    usuario_id: int,
) -> schemas.LoteInsumo:
    # Baja lógica con auditoría: el lote no se borra, queda inhabilitado
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()

    db.execute(
        update(LoteInsumo)
        .where(LoteInsumo.id == lote_id)
        .values(
            activo=False,
            motivo_inhabilitacion=datos.motivo,
            fecha_inhabilitacion=datetime.now(),
            usuario_inhabilitacion_id=usuario_id,
        )
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()

    db.refresh(db_lote)
    return db_lote