from datetime import date
from enum import Enum
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.sectores.schemas import Sector


class CategoriaEquipo(str, Enum):
    HELADERA = "heladera"
    HORNO = "horno"
    BALANZA = "balanza"
    TERMOMETRO = "termometro"
    OTRO = "otro"

class CalibracionEquipoBase(BaseModel):
    fecha_calibracion: Annotated[date, Field(description="Fecha en la que se realizó la calibración")]
    observaciones: Annotated[Optional[str], Field(default=None, max_length=255, description="Observaciones")]
    certificado_url: Annotated[Optional[str], Field(default=None, max_length=255, description="URL del certificado adjunto")]

    @field_validator("fecha_calibracion")
    @classmethod
    def validar_fecha_no_futura(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError("La fecha de calibración no puede ser futura")
        return valor


class CalibracionEquipoCreate(CalibracionEquipoBase):
    pass


class CalibracionEquipo(CalibracionEquipoBase):
    id: int
    equipo_id: int
    model_config = ConfigDict(from_attributes=True)

class EquipoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100, description="Nombre del equipo")]
    marca: Annotated[str, Field(min_length=1, max_length=100, description="Marca del equipo")]
    numero_serie: Annotated[str, Field(min_length=1, max_length=100, description="Número de serie del equipo")]
    categoria: Annotated[CategoriaEquipo, Field(description="Categoría del equipo")]
    sector_id: Annotated[int, Field(description="Sector al que pertenece el equipo")]
    ubicacion: Annotated[Optional[str], Field(default=None, max_length=100, description="Ubicación del equipo")]

    frecuencia_calibracion_dias: Annotated[
        Optional[int],
        Field(default=None, gt=0, description="Periodicidad de calibración en días"),
    ]
    fecha_ultima_calibracion: Annotated[
        Optional[date],
        Field(default=None, description="Fecha de la última calibración"),
    ]

    @field_validator("fecha_ultima_calibracion")
    @classmethod
    def validar_ultima_calibracion_no_futura(cls, valor: Optional[date]) -> Optional[date]:
        if valor is not None and valor > date.today():
            raise ValueError("La fecha de última calibración no puede ser futura")
        return valor


class EquipoCreate(EquipoBase):
    pass


class EquipoUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    marca: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    numero_serie: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    categoria: Annotated[Optional[CategoriaEquipo], Field(default=None)]
    sector_id: Annotated[Optional[int], Field(default=None, gt=0)]
    ubicacion: Annotated[Optional[str], Field(default=None, max_length=100)]
    activo: Annotated[Optional[bool], Field(default=None)]

    frecuencia_calibracion_dias: Annotated[Optional[int], Field(default=None, gt=0)]
    fecha_ultima_calibracion: Annotated[Optional[date], Field(default=None)]

    @field_validator("fecha_ultima_calibracion")
    @classmethod
    def validar_ultima_calibracion_update(cls, valor: Optional[date]) -> Optional[date]:
        if valor is not None and valor > date.today():
            raise ValueError("La fecha de última calibración no puede ser futura")
        return valor


class Equipo(EquipoBase):
    id: int
    activo: bool
    sector: Sector
    model_config = ConfigDict(from_attributes=True)

class AlertaCalibracion(BaseModel):
        entidad_id: int
        entidad: str
        tipo: str = "equipo"
        proxima_fecha: date
        dias_restantes: int
        estado: str #vencido, proximo, al_dia