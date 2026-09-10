from datetime import date
from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.capacidad.models import Capacidad, PersonaCapacidad
from src.capacidad import schemas, exceptions


# operaciones CRUD para Capacidad

def crear_capacidad(db: Session, capacidad: schemas.CapacidadCreate) -> schemas.Capacidad:
    # Verifica que no exista una capacidad con el mismo nombre
    db_capacidad_duplicada = db.scalar(select(Capacidad).where(Capacidad.nombre == capacidad.nombre))
    if db_capacidad_duplicada:
        raise exceptions.NombreDuplicado()

    # Crea la capacidad y la sube a la db
    db_capacidad = Capacidad(**capacidad.model_dump())
    db.add(db_capacidad)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.BadRequest(detail="Ocurrio un error inesperado")
    db.refresh(db_capacidad)
    return db_capacidad


def leer_capacidad(db: Session, capacidad_id: int) -> schemas.Capacidad:
    # Verificamos que la capacidad exista en la base
    db_capacidad = db.scalar(select(Capacidad).where(Capacidad.id == capacidad_id))
    if not db_capacidad:
        raise exceptions.CapacidadNoExiste()

    # Si existe la capacidad la retorna
    return db_capacidad


def listar_capacidades(db: Session) -> List[Capacidad]:
    return db.scalars(select(Capacidad)).all()


def modificar_capacidad(db: Session, capacidad_id: int, capacidad: schemas.CapacidadUpdate) -> schemas.Capacidad:
    db_capacidad = leer_capacidad(db, capacidad_id)
    update_data = capacidad.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        # Verifica que no exista otra capacidad con el mismo nombre
        db_capacidad_duplicada = db.scalar(select(Capacidad).where(Capacidad.nombre == capacidad.nombre))
        if db_capacidad_duplicada and db_capacidad_duplicada.id != capacidad_id:
            raise exceptions.NombreDuplicado()
    if update_data:
        # Modifica la capacidad y la sube a la db
        db.execute(update(Capacidad).where(Capacidad.id == capacidad_id).values(**update_data))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.BadRequest(detail="Ocurrio un error inesperado")

        db.refresh(db_capacidad)
    return db_capacidad


# operaciones para la asignación de una Capacidad a una Persona

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
