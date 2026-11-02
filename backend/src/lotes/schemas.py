from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field


class ConsumoInsumoCreate(BaseModel):
    insumo_id: int
    cantidad_real_utilizada: Annotated[float, Field(ge=0, description="Cantidad real consumida (debe ser mayor o igual a cero)")]


class ConsumoInsumoOut(BaseModel):
    id: int
    insumo_id: int
    insumo_nombre: str
    unidad_medida_simbolo: str
    cantidad_teorica: float
    cantidad_real_utilizada: float

    model_config = ConfigDict(from_attributes=True)


class LoteBase(BaseModel):
    producto_id: int
    codigo_lote: Optional[str] = None
    fecha_elaboracion: datetime
    fecha_vencimiento: date
    cantidad_producida: Annotated[Decimal, Field(gt=0, description="La cantidad producida debe ser mayor a cero")]
    observaciones: Optional[str] = None


class LoteCreate(LoteBase):
    consumos: list[ConsumoInsumoCreate] = []


class Lote(LoteBase):
    id: int
    receta_id: int
    operador_id: int
    fecha_registro_sistema: datetime

    producto_nombre: Optional[str] = None
    unidad_medida_simbolo: Optional[str] = None
    receta_codigo: Optional[str] = None
    receta_nombre: Optional[str] = None
    operador_nombre: Optional[str] = None

    consumos_insumos: list[ConsumoInsumoOut] = []

    model_config = ConfigDict(from_attributes=True)


class InsumoTeoricoRecetaOut(BaseModel):
    insumo_id: int
    nombre: str
    unidad_medida_simbolo: str
    cantidad_nominal_receta: float

    model_config = ConfigDict(from_attributes=True)


class ProductoDisponibleLoteOut(BaseModel):
    id: int
    nombre: str
    descripcion: str
    unidad_medida_simbolo: str
    dias_vida_util: Optional[int] = None

    receta_id: int
    receta_codigo: str
    receta_nombre: str
    rendimiento_estandar: Decimal

    insumos_teoricos: list[InsumoTeoricoRecetaOut] = []

    model_config = ConfigDict(from_attributes=True)
