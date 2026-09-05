from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.equipos.models import Equipo
from src.equipos import schemas, exceptions

def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> Equipo:
    equipo_existente = db.scalar(select(Equipo).where(Equipo.nombre == equipo.nombre))
    if equipo_existente:
        raise exceptions.NombreDuplicado()
    
    _equipo = Equipo(**equipo.model_dump())
    db.add(_equipo)
    db.commit()
    db.refresh(_equipo)
    return _equipo

def listar_equipos(db: Session) -> List[schemas.Equipo]:
    return db.scalars(select(Equipo)).all()

def leer_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()
    
    return db_equipo

def modificar_equipo(db: Session, equipo_id: int, equipo: schemas.EquipoUpdate) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    update_data = equipo.model_dump(exclude_unset=True)
    if "nombre" in update_data:
        nombre_existente = db.scalar(
            select(Equipo).where(
                Equipo.nombre == update_data["nombre"], 
                Equipo.id != equipo_id
            )
        )
        if nombre_existente:
            raise exceptions.NombreDuplicado()
    if update_data:
        db.execute(
            update(Equipo).where(Equipo.id == equipo_id).values(**update_data)
        )
        db.commit()
        db.refresh(db_equipo)
    return db_equipo
    
def eliminar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    db.execute(delete(Equipo).where(Equipo.id == equipo_id))
    db.commit()
    return db_equipo
    