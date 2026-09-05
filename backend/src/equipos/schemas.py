from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Annotated
from enum import Enum

class CategoriaEquipo(str, Enum):
    HELADERA = "heladera"
    HORNO = "horno"
    BALANZA = "balanza"
    TERMOMETRO = "termometro"
    OTRO = "otro"

class EquipoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="El nombre del equipo es obligatorio")]
    categoria: Annotated[CategoriaEquipo, Field(description="Categoría del equipo")]
    ubicacion: Annotated[Optional[str], Field(default=None, max_length=50, description="Ubicacion del equipo")]

class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100, description="El nombre del equipo es obligatorio")]
    categoria: Annotated[Optional[CategoriaEquipo], Field(default=None, description="Categoría del equipo")]
    ubicacion: Annotated[Optional[str], Field(default=None, max_length=50, description="Ubicacion del equipo")]

class Equipo(EquipoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)