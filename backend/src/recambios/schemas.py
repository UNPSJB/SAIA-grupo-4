from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional
from datetime import date, datetime
from src.elementos_limpieza.schemas import ElementoLimpieza
from src.recambios.constants import EstadoRecambio


class RecambioCreate(BaseModel):
    elemento_id: Annotated[int, Field(description="Elemento de limpieza que se recambió")]
    fecha_recambio: Annotated[Optional[date], Field(default=None, description="Día del recambio (hoy si no se indica)")]
    observaciones: Annotated[Optional[str], Field(default=None, max_length=200)]


class Recambio(BaseModel):
    id: int
    elemento_id: int
    fecha_recambio: datetime
    observaciones: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class AlertaRecambio(BaseModel):
    elemento: ElementoLimpieza
    proxima_fecha: date
    dias_restantes: int
    estado: EstadoRecambio
