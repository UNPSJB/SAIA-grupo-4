from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.persona.models import Persona
from src.persona import schemas, exceptions
from src.capacidad.models import PersonaCapacidad


def crear_persona(
    db: Session,
    persona: schemas.PersonaCreate
) -> Persona:

    db_persona = Persona(**persona.model_dump())

    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)

    return db_persona


def listar_personal(
    db: Session
) -> List[Persona]:

    return db.scalars(
        select(Persona)
    ).all()


def leer_persona(
    db: Session,
    persona_id: int
) -> Persona:

    db_persona = db.scalar(
        select(Persona).where(
            Persona.id == persona_id
        )
    )

    if db_persona is None:
        raise exceptions.PersonaNoEncontrada()

    return db_persona


def modificar_persona(
    db: Session,
    persona_id: int,
    persona: schemas.PersonaUpdate
) -> Persona:

    db_persona = leer_persona(
        db,
        persona_id
    )

    db.execute(
        update(Persona)
        .where(Persona.id == persona_id)
        .values(**persona.model_dump())
    )

    db.commit()
    db.refresh(db_persona)

    return db_persona


def eliminar_persona(
    db: Session,
    persona_id: int
) -> Persona:

    db_persona = leer_persona(
        db,
        persona_id
    )

    # Borramos primero las capacidades asignadas a esta persona,
    # para no violar la foreign key en personal_capacidad.persona_id
    db.execute(
        delete(PersonaCapacidad)
        .where(PersonaCapacidad.persona_id == persona_id)
    )

    db.execute(
        delete(Persona)
        .where(Persona.id == persona_id)
    )

    db.commit()

    return db_persona