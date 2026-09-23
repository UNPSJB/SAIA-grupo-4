from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, Annotated, List
from src.capacidades.schemas import Capacidad

class PersonaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100)]
    apellido: Annotated[str, Field(min_length=1, max_length=100)]
    dni: Annotated[str, Field(min_length=1, max_length=20)]
    legajo: Annotated[int, Field(gt=0)]
    email: Annotated[Optional[EmailStr], Field(default=None, max_length=150)]
    telefono: Annotated[Optional[str], Field(default=None, max_length=50)]

class PersonaCreate(PersonaBase):
    capacidades_ids: Annotated[List[int], Field(min_length=1)]

class PersonaUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    apellido: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    dni: Annotated[Optional[str], Field(default=None, min_length=1, max_length=20)]
    legajo: Annotated[Optional[int], Field(default=None, gt=0)]
    email: Annotated[Optional[EmailStr], Field(default=None, max_length=150)]
    telefono: Annotated[Optional[str], Field(default=None, max_length=50)]
    activo: Annotated[Optional[bool], Field(default=None)]
    capacidades_ids: Annotated[Optional[List[int]], Field(default=None)]

class PersonaCapacidad(BaseModel):
    id: Annotated[int, Field(gt=0)]
    persona_id: Annotated[int, Field(gt=0)]
    capacidad_id: Annotated[int, Field(gt=0)]
    fecha_desde: Annotated[datetime, Field()]
    fecha_hasta: Annotated[Optional[datetime], Field(default=None)]
    activo: Annotated[bool, Field()]
    capacidad: Capacidad
    model_config = ConfigDict(from_attributes=True)

class Persona(PersonaBase):
    id: int
    fecha_alta: datetime
    activo: bool
    capacidades: List[PersonaCapacidad] = []
    model_config = ConfigDict(from_attributes=True)
