from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.elementos_limpieza.models import ElementoLimpieza
from src.elementos_limpieza import schemas, exceptions
from src.sectores.models import Sector
from src.tipo_elemento_limpieza.models import TipoElementoLimpieza


def _validar_tipo(db: Session, tipo_id: int) -> None:
    db_tipo = db.scalar(select(TipoElementoLimpieza).where(TipoElementoLimpieza.id == tipo_id))
    if db_tipo is None or not db_tipo.activo:
        raise exceptions.TipoInvalido()


def _validar_sector(db: Session, sector_id: int) -> None:
    db_sector = db.scalar(select(Sector).where(Sector.id == sector_id))
    if db_sector is None or not db_sector.activo:
        raise exceptions.SectorInvalido()


def crear_elemento_limpieza(db: Session, elemento: schemas.ElementoLimpiezaCreate) -> schemas.ElementoLimpieza:
    _validar_tipo(db, elemento.tipo_id)
    if elemento.sector_id is not None:
        _validar_sector(db, elemento.sector_id)

    db_elemento = ElementoLimpieza(**elemento.model_dump())
    db.add(db_elemento)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_elemento)
    return db_elemento


def leer_elemento_limpieza(db: Session, elemento_id: int) -> schemas.ElementoLimpieza:
    db_elemento = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
    if not db_elemento:
        raise exceptions.ElementoNoExiste()
    return db_elemento


def listar_elementos_limpieza(db: Session):
    return db.scalars(select(ElementoLimpieza)).all()


def modificar_elemento_limpieza(db: Session, elemento_id: int, elemento: schemas.ElementoLimpiezaUpdate) -> schemas.ElementoLimpiezaUpdate:
    db_elemento = leer_elemento_limpieza(db, elemento_id)
    update_data = elemento.model_dump(exclude_unset=True)

    if "tipo_id" in update_data and update_data["tipo_id"] is not None:
        _validar_tipo(db, update_data["tipo_id"])

    if "sector_id" in update_data and update_data["sector_id"] is not None:
        _validar_sector(db, update_data["sector_id"])

    if "activo" in update_data:
        if db_elemento.activo == elemento.activo:
            if elemento.activo:
                raise exceptions.ElementoActivo()
            else:
                raise exceptions.ElementoBaja()

    if update_data:
        db.execute(update(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id).values(**update_data))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()
        db.refresh(db_elemento)
    return db_elemento


def eliminar_elemento_limpieza(db: Session, elemento_id: int) -> schemas.ElementoLimpiezaDelete:
    elemento = schemas.ElementoLimpiezaUpdate(activo=False)
    return modificar_elemento_limpieza(db, elemento_id, elemento)