from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field
from src.lotes_insumo.constants import EstadoLote

class LoteInsumoBase(BaseModel):
    codigo_lote: Annotated[str, Field(min_length=1, max_length=50, description="Código identificador del lote, obligatorio")]
    fecha_vencimiento: Annotated[date, Field(description="Fecha de vencimiento del lote, obligatoria")]
    cantidad_inicial: Annotated[Decimal, Field(gt=0, max_digits=10, decimal_places=3, description="Cantidad inicial / tamaño del lote, obligatorio y mayor a cero")]
    # Saca espacios al principio y al final, así "   " no pasa como código válido
    model_config = ConfigDict(str_strip_whitespace=True)


class LoteInsumoCreate(LoteInsumoBase):
    insumo_id: Annotated[int, Field(description="Insumo al que pertenece el lote")]


class LoteInsumoUpdate(BaseModel):
    codigo_lote: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50, description="Código identificador del lote")]
    fecha_vencimiento: Annotated[Optional[date], Field(default=None, description="Fecha de vencimiento del lote")]

    model_config = ConfigDict(str_strip_whitespace=True)

class PersonalResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)

class LoteInsumo(LoteInsumoBase):
    id: int
    insumo_id: int
    cantidad_actual: Decimal
    activo: bool
    motivo_inhabilitacion: Optional[str] = None
    fecha_inhabilitacion: Optional[datetime] = None
    usuario_inhabilitacion_id: Optional[int] = None
    usuario_inhabilitacion: Optional[PersonalResumen] = None
    estado: EstadoLote

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class LoteInsumoInhabilitar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    motivo: str = Field(..., min_length=10, max_length=500)