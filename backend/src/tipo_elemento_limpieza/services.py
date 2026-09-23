from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.tipo_elemento_limpieza.models import TipoElementoLimpieza
from src.tipo_elemento_limpieza import schemas, exceptions


def crear_tipo(db: Session, tipo: schemas.TipoElementoLimpiezaCreate) -> schemas.TipoElementoLimpieza:
    db_existente = db.scalar(select(TipoElementoLimpieza).where(TipoElementoLimpieza.nombre == tipo.nombre))
    if db_existente:
        if db_existente.activo:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(tipo_id=db_existente.id)

    db_tipo = TipoElementoLimpieza(**tipo.model_dump())
    db.add(db_tipo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_tipo)
    return db_tipo


def leer_tipo(db: Session, tipo_id: int) -> schemas.TipoElementoLimpieza:
    db_tipo = db.scalar(select(TipoElementoLimpieza).where(TipoElementoLimpieza.id == tipo_id))
    if not db_tipo:
        raise exceptions.TipoNoExiste()
    return db_tipo


def listar_tipos(db: Session):
    return db.scalars(select(TipoElementoLimpieza)).all()


def modificar_tipo(db: Session, tipo_id: int, tipo: schemas.TipoElementoLimpiezaUpdate) -> schemas.TipoElementoLimpiezaUpdate:
    db_tipo = leer_tipo(db, tipo_id)
    update_data = tipo.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        db_duplicado = db.scalar(select(TipoElementoLimpieza).where(TipoElementoLimpieza.nombre == tipo.nombre, TipoElementoLimpieza.id != tipo_id))
        if db_duplicado:
            raise exceptions.NombreDuplicado()

    if "activo" in update_data:
        if db_tipo.activo == tipo.activo:
            if tipo.activo:
                raise exceptions.TipoActivo()
            else:
                raise exceptions.TipoBaja()

    if update_data:
        db.execute(update(TipoElementoLimpieza).where(TipoElementoLimpieza.id == tipo_id).values(**update_data))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()
        db.refresh(db_tipo)
    return db_tipo


def eliminar_tipo(db: Session, tipo_id: int) -> schemas.TipoElementoLimpiezaDelete:
    tipo = schemas.TipoElementoLimpiezaUpdate(activo=False)
    return modificar_tipo(db, tipo_id, tipo)