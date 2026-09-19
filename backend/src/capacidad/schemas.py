from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated


class CapacidadBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="El nombre de la capacidad es obligatorio")]


class CapacidadCreate(CapacidadBase):
    pass


class CapacidadUpdate(CapacidadBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="El nombre de la capacidad es obligatorio")]


class Capacidad(CapacidadBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Schemas para la asignación de una Capacidad a una Persona

class PersonaCapacidadBase(BaseModel):
    capacidad_id: int


class PersonaCapacidadCreate(PersonaCapacidadBase):
    pass


class PersonaCapacidad(BaseModel):
    id: int
    persona_id: int
    capacidad_id: int
    model_config = ConfigDict(from_attributes=True)


class PersonaCapacidadConDetalle(BaseModel):
    id: int
    persona_nombre: str
    capacidad: Capacidad
    model_config = ConfigDict(from_attributes=True)