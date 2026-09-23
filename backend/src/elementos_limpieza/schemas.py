from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional
from datetime import datetime


class TipoElementoLimpieza(BaseModel):
    id: int
    nombre: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class Sector(BaseModel):
    id: int
    nombre: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)

class Equipo(BaseModel):
    id: int
    nombre: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)

class ElementoLimpiezaBase(BaseModel):
    tipo_id: Annotated[int, Field(description="Tipo de elemento de limpieza al que corresponde esta instancia")]
    sector_id: Annotated[Optional[int], Field(default=None, description="Sector donde se usa el elemento (opcional)")]
    frecuencia_recambio_dias: Annotated[Optional[int], Field(default=None, gt=0, description="Frecuencia de recambio recomendada, en días")]
    activo: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]

class ElementoLimpiezaCreate(ElementoLimpiezaBase):
    pass

class ElementoLimpiezaUpdate(BaseModel):
    tipo_id: Annotated[Optional[int], Field(default=None)]
    sector_id: Annotated[Optional[int], Field(default=None)]
    equipo_id: Annotated[Optional[int], Field(default=None)]
    frecuencia_recambio_dias: Annotated[Optional[int], Field(default=None, gt=0)]
    activo: Annotated[Optional[bool], Field(default=None)]

class ElementoLimpiezaDelete(ElementoLimpiezaBase):
    pass

class ElementoLimpieza(ElementoLimpiezaBase):
    id: int
    fecha_ultimo_recambio: Optional[datetime]
    tipo: TipoElementoLimpieza
    sector: Optional[Sector]
    equipo: Optional[Equipo]

    model_config = ConfigDict(from_attributes=True)