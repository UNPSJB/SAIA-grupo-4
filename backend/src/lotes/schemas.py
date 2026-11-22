from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field
from src.lotes.constants import EstadoLoteProduccion


class DetalleLoteInsumoCreate(BaseModel):
    lote_insumo_id: int
    cantidad: Annotated[
        Decimal,
        Field(gt=0, max_digits=10, decimal_places=3, description="Cantidad descontada del lote físico"),
    ]
    unidad: Optional[str] = None


class DetalleLoteInsumoOut(BaseModel):
    id: int
    lote_insumo_id: int
    codigo_lote_insumo: str
    fecha_vencimiento: Optional[date] = None
    cantidad: float

    model_config = ConfigDict(from_attributes=True)


class ConsumoInsumoCreate(BaseModel):
    insumo_id: int
    cantidad_real_utilizada: Annotated[float, Field(ge=0, description="Cantidad real consumida (debe ser mayor o igual a cero)")]
    unidad: Optional[str] = None
    lotes: list[DetalleLoteInsumoCreate] = []


class ConsumoInsumoOut(BaseModel):
    id: int
    insumo_id: int
    insumo_nombre: str
    unidad_medida_simbolo: str
    cantidad_teorica: float
    cantidad_real_utilizada: float
    detalles_lotes: list[DetalleLoteInsumoOut] = []

    model_config = ConfigDict(from_attributes=True)


class LoteBase(BaseModel):
    producto_id: int
    codigo_lote: Optional[str] = None
    fecha_elaboracion: datetime
    fecha_vencimiento: date
    cantidad_producida: Annotated[Decimal, Field(gt=0, description="La cantidad producida debe ser mayor a cero")]
    observaciones: Optional[str] = None


class LoteCreate(LoteBase):
    masa_tanda_g: Optional[Annotated[Decimal, Field(gt=0)]] = Field(
        default=None,
        description="Masa base de tanda elaborada en gramos para escalar los insumos teóricos",
    )
    consumos: list[ConsumoInsumoCreate] = []


class PersonalResumen(BaseModel):
    id: int
    nombre: str
    apellido: str

    model_config = ConfigDict(from_attributes=True)


class LoteRetener(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    motivo: str = Field(..., min_length=10, max_length=500)


class Lote(LoteBase):
    id: int
    receta_id: int
    operador_id: int
    fecha_registro_sistema: datetime

    estado: EstadoLoteProduccion = EstadoLoteProduccion.ACTIVO
    motivo_retencion: Optional[str] = None
    fecha_retencion: Optional[datetime] = None
    usuario_retencion_id: Optional[int] = None
    usuario_retencion: Optional[PersonalResumen] = None

    producto_nombre: Optional[str] = None
    unidad_medida_simbolo: Optional[str] = None
    receta_codigo: Optional[str] = None
    receta_nombre: Optional[str] = None
    operador_nombre: Optional[str] = None

    consumos_insumos: list[ConsumoInsumoOut] = []

    model_config = ConfigDict(from_attributes=True)


class LoteInsumoDisponibleOut(BaseModel):
    id: int
    insumo_id: int
    codigo_lote: str
    fecha_vencimiento: date
    cantidad_inicial: float
    cantidad_actual: float

    model_config = ConfigDict(from_attributes=True)


class InsumoTeoricoRecetaOut(BaseModel):
    insumo_id: int
    nombre: str
    unidad_medida_simbolo: str
    unidad_medida_tipo: Optional[str] = None
    cantidad_nominal_receta: float
    lotes_disponibles: list[LoteInsumoDisponibleOut] = []

    model_config = ConfigDict(from_attributes=True)


class ProductoDisponibleLoteOut(BaseModel):
    id: int
    nombre: str
    descripcion: str
    unidad_medida_simbolo: str
    unidad_medida_tipo: Optional[str] = None
    dias_vida_util: Optional[int] = None

    receta_id: int
    receta_codigo: str
    receta_nombre: str
    receta_version: int = 1
    rendimiento_estandar: Decimal
    tamano_porcion: Optional[Decimal] = None

    insumos_teoricos: list[InsumoTeoricoRecetaOut] = []

    model_config = ConfigDict(from_attributes=True)
