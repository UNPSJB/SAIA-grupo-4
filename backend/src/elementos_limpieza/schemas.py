from pydantic import BaseModel, ConfigDict, Field, model_validator
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
    nombre: Annotated[str, Field(min_length=1, max_length=20, description="Nombre o descripción de esta instancia del elemento")]
    tipo_id: Annotated[int, Field(description="Tipo de elemento de limpieza al que corresponde esta instancia")]
    sector_id: Annotated[Optional[int], Field(default=None, description="Sector donde se usa el elemento (opcional)")]
    equipo_id: Annotated[Optional[int], Field(default=None, description="Equipo donde se usa el elemento (opcional)")]
    frecuencia_recambio_dias: Annotated[Optional[int], Field(default=None, gt=0, description="Frecuencia de recambio recomendada, en días")]
    activo: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]

    @model_validator(mode="after")
    def validar_ubicacion_exclusiva(self) -> "ElementoLimpiezaBase":
        if self.sector_id is not None and self.equipo_id is not None:
            raise ValueError(
                "Un elemento de limpieza no puede estar asociado a un sector y a "
                "un equipo al mismo tiempo. Debe asignarse a un sector, a un equipo "
                "o a ninguno (uso general)."
            )
        return self


class ElementoLimpiezaCreate(ElementoLimpiezaBase):
    pass


class ElementoLimpiezaUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=20)]
    tipo_id: Annotated[Optional[int], Field(default=None)]
    sector_id: Annotated[Optional[int], Field(default=None)]
    equipo_id: Annotated[Optional[int], Field(default=None)]
    frecuencia_recambio_dias: Annotated[Optional[int], Field(default=None, gt=0)]
    activo: Annotated[Optional[bool], Field(default=None)]


class ElementoLimpiezaDelete(ElementoLimpiezaBase):
    pass


class ElementoLimpieza(ElementoLimpiezaBase):
    id: int
    codigo: str
    fecha_ultimo_recambio: Optional[datetime]
    tipo: TipoElementoLimpieza
    sector: Optional[Sector]
    equipo: Optional[Equipo]

    model_config = ConfigDict(from_attributes=True)