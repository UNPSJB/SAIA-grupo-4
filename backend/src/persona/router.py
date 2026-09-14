from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.persona import schemas, services
from src.capacidad import schemas as capacidad_schemas, services as capacidad_services


router = APIRouter(
    prefix="/personal",
    tags= ["personal"]
)


@router.post("/", response_model=schemas.Persona)
def create_persona(
    persona: schemas.PersonaCreate,
    db: Session = Depends(get_db)
):
    return services.crear_persona(
        db,
        persona
    )


@router.get("/", response_model=list[schemas.Persona])
def read_personal(
    db: Session = Depends(get_db)
):
    return services.listar_personal(db)


@router.get("/{persona_id}", response_model=schemas.Persona)
def read_persona(
    persona_id: int,
    db: Session = Depends(get_db)
):
    return services.leer_persona(
        db,
        persona_id
    )


@router.put("/{persona_id}", response_model=schemas.Persona)
def update_persona(
    persona_id: int,
    persona: schemas.PersonaUpdate,
    db: Session = Depends(get_db)
):
    return services.modificar_persona (
        db,
        persona_id,
        persona
    )


@router.delete("/{persona_id}", response_model=schemas.Persona)
def delete_persona(
    persona_id: int,
    db: Session = Depends(get_db)
):
    return services.eliminar_persona(
        db,
        persona_id
    )


@router.post("/{persona_id}/capacidades", response_model=capacidad_schemas.PersonaCapacidad)
def asignar_capacidad_a_persona(
    persona_id: int,
    datos: capacidad_schemas.PersonaCapacidadCreate,
    db: Session = Depends(get_db)
):
    return capacidad_services.asignar_capacidad(db, persona_id, datos)


@router.delete("/{persona_id}/capacidades/{capacidad_id}", response_model=capacidad_schemas.PersonaCapacidad)
def quitar_capacidad_a_persona(
    persona_id: int,
    capacidad_id: int,
    db: Session = Depends(get_db)
):
    return capacidad_services.quitar_capacidad(db, persona_id, capacidad_id)


@router.get("/{persona_id}/capacidades", response_model=list[capacidad_schemas.PersonaCapacidadConDetalle])
def listar_capacidades_de_persona(
    persona_id: int,
    db: Session = Depends(get_db)
):
    return capacidad_services.listar_capacidades_de_persona(db, persona_id)