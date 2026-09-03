from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions


# operaciones CRUD para Insumo

def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> schemas.Insumo:
    # Verifica que no exista un insumo con el mismo nombre
    db_insumo_duplicado = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre))
    if db_insumo_duplicado:
        raise exceptions.NombreDuplicado()

    # Crea el insumo y lo sube a la db
    db_insumo = Insumo(**insumo.model_dump())
    db.add(db_insumo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.BadRequest(detail="Ocurrio un error inesperado") # Lanzar un error y realizar rollback si ocurre un error al subir los cambios. Es probacle crear una excepcion  
    db.refresh(db_insumo)
    return db_insumo


def leer_insumo(db: Session, insumo_id: int) -> schemas.Insumo:
    # Verificamos que el insumo exista en la base
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if not db_insumo:
        raise exceptions.InsumoNoExiste()

    # Si existe el insumo lo retorna
    return db_insumo


def listar_insumos(db: Session):
    return db.scalars(select(Insumo)).all()