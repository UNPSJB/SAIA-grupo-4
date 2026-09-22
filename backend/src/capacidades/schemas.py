from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional
from src.capacidades.models import TipoCapacidad

class CapacidadBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre de la capacidad")]
    descripcion: Annotated[Optional[str], Field(default=None, max_length=255, description="Descripción de la capacidad")]

class CapacidadCreate(CapacidadBase):
    pass

class CapacidadUpdate(CapacidadBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    descripcion: Annotated[Optional[str], Field(default=None, max_length=255)]
    activo: Annotated[Optional[bool], Field(default=None)]

class Capacidad(CapacidadBase):
    id: int
    tipo: TipoCapacidad
    activo: bool
    model_config = ConfigDict(from_attributes=True)
