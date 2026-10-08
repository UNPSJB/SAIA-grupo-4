from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.tipo_incidente.models import TipoIncidente
from src.tipo_incidente import schemas, exceptions

def crear_tipo(db: Session, tipo: schemas.TipoIncidenteCreate) -> schemas.TipoIncidente:
    tipo_existente = db.scalar(select(TipoIncidente).where(TipoIncidente.nombre == tipo.nombre))
    if tipo_existente:
        if tipo_existente.activo:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(tipo_id=tipo_existente.id)

    _tipo = TipoIncidente(**tipo.model_dump())
    db.add(_tipo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(_tipo)
    return _tipo

def leer_tipo(db: Session, tipo_id: int) -> schemas.TipoIncidente:
    _tipo = db.scalar(select(TipoIncidente).where(TipoIncidente.id == tipo_id))
    if not _tipo:
        raise exceptions.TipoNoExiste()
    return _tipo

def listar_tipos(db: Session):
    return db.scalars(select(TipoIncidente)).all()

def modificar_tipo(db: Session, tipo_id: int, tipo: schemas.TipoIncidenteUpdate) -> schemas.TipoIncidenteUpdate:
    db_tipo = leer_tipo(db, tipo_id)
    update_data = tipo.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        db_duplicado = db.scalar(select(TipoIncidente).where(TipoIncidente.nombre == tipo.nombre, TipoIncidente.id != tipo_id))
        if db_duplicado:
            raise exceptions.NombreDuplicado()

    if "activo" in update_data:
        if db_tipo.activo == tipo.activo:
            if tipo.activo:
                raise exceptions.TipoActivo()
            else:
                raise exceptions.TipoInactivo()

    if update_data:
        db.execute(update(TipoIncidente).where(TipoIncidente.id == tipo_id).values(**update_data))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()
        db.refresh(db_tipo)
    return db_tipo

def eliminar_tipo(db: Session, tipo_id: int) -> schemas.TipoIncidenteDelete:
    tipo = schemas.TipoIncidenteUpdate(activo=False)
    return modificar_tipo(db, tipo_id, tipo)