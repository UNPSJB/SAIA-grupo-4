from datetime import date
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.capacidad.models import Capacidad, PersonaCapacidad
from src.capacidad import schemas, exceptions

def crear_capacidad(db: Session, capacidad: schemas.CapacidadCreate) -> Capacidad:
    db_capacidad = Capacidad(**capacidad.model_dump())
    db.add(db_capacidad)
    db.commit()
    db.refresh(db_capacidad)
    return db_capacidad

def listar_capacidades(db: Session) -> List[Capacidad]:
    return db.scalars(select(Capacidad)).all()

def leer_capacidad(db: Session, capacidad_id: int) -> Capacidad:
    db_capacidad = db.scalar(
        select(Capacidad).where(Capacidad.id == capacidad_id)
    )
    if db_capacidad is None:
        raise exceptions.CapacidadNoEncontrada()
    return db_capacidad

def asignar_capacidad(
    db: Session, persona_id: int, datos: schemas.PersonaCapacidadCreate
) -> PersonaCapacidad:
    db_asignacion = PersonaCapacidad(persona_id=persona_id, **datos.model_dump())
    db.add(db_asignacion)
    db.commit()
    db.refresh(db_asignacion)
    return db_asignacion

def quitar_capacidad(
    db: Session, persona_id: int, capacidad_id: int
) -> PersonaCapacidad:
    db_asignacion = db.scalar(
        select(PersonaCapacidad).where(
            PersonaCapacidad.persona_id == persona_id,
            PersonaCapacidad.capacidad_id == capacidad_id,
            PersonaCapacidad.fecha_hasta.is_(None)
        )
    )
    if db_asignacion is None:
        raise exceptions.PersonaCapacidadNoEncontrada()

    db_asignacion.fecha_hasta = date.today()
    db.commit()
    db.refresh(db_asignacion)
    return db_asignacion

def listar_capacidades_de_persona(
    db: Session, persona_id: int
) -> List[PersonaCapacidad]:
    return db.scalars(
        select(PersonaCapacidad).where(PersonaCapacidad.persona_id == persona_id)
    ).all()