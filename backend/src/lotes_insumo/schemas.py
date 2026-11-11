from datetime import date, datetime
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field
from src.lotes_insumo.constants import EstadoLote

class LoteInsumoBase(BaseModel):
    codigo_lote: Annotated[str, Field(min_length=1, max_length=50, description="Código identificador del lote, obligatorio")]
    fecha_vencimiento: Annotated[date, Field(description="Fecha de vencimiento del lote, obligatoria")]
    # Saca espacios al principio y al final, así "   " no pasa como código válido
    model_config = ConfigDict(str_strip_whitespace=True)


class LoteInsumoCreate(LoteInsumoBase):
    insumo_id: Annotated[int, Field(description="Insumo al que pertenece el lote")]


class LoteInsumoUpdate(BaseModel):
    codigo_lote: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50, description="Código identificador del lote")]
    fecha_vencimiento: Annotated[Optional[date], Field(default=None, description="Fecha de vencimiento del lote")]

    model_config = ConfigDict(str_strip_whitespace=True)


class LoteInsumo(LoteInsumoBase):
    id: int
    insumo_id: int
    activo: bool
    motivo_inhabilitacion: Optional[str] = None
    fecha_inhabilitacion: Optional[datetime] = None
    usuario_inhabilitacion_id: Optional[int] = None
    estado: EstadoLote

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class LoteInsumoInhabilitar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    motivo: str = Field(..., min_length=10, max_length=500)