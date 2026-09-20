from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Annotated
from enum import Enum
from src.sectores.schemas import Sector

class CategoriaEquipo(str, Enum):
    HELADERA = "heladera"
    HORNO = "horno"
    BALANZA = "balanza"
    TERMOMETRO = "termometro"
    OTRO = "otro"

class EquipoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre del equipo")]
    marca: Annotated[str, Field(min_length=1, max_length=100, description="Marca del equipo")]
    numero_serie: Annotated[str, Field(min_length=1, max_length=100, description="Número de serie del equipo")]
    categoria: Annotated[CategoriaEquipo, Field(description="Categoría del equipo")]
    sector_id: Annotated[int, Field(description="Sector al que pertenece el equipo")]
    ubicacion: Annotated[Optional[str], Field(default=None, max_length=100, description="Ubicación del equipo")]

class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(EquipoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    marca: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    numero_serie: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    categoria: Annotated[Optional[CategoriaEquipo], Field(default=None)]
    sector_id: Annotated[Optional[int], Field(default=None, gt=0)]
    ubicacion: Annotated[Optional[str], Field(default=None, max_length=100)]
    activo: Annotated[Optional[bool], Field(default=None)]

class Equipo(EquipoBase):
    id: int
    activo: bool
    sector: Sector
    model_config = ConfigDict(from_attributes=True)