from datetime import datetime
from decimal import Decimal
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.recetas.constants import EstadoReceta

class EquipoResumenOut(BaseModel):
    id: int
    nombre: str
    activo: bool = True
    model_config = ConfigDict(from_attributes=True)

class InsumoResumenOut(BaseModel):
    id: int
    nombre: str
    unidad_medida: str
    disponible: bool = True
    model_config = ConfigDict(from_attributes=True)
    
    @field_validator("unidad_medida", mode="before")
    @classmethod
    def extraer_unidad(cls, v):
        # Si recibe el modelo de SQLAlchemy, saca el símbolo. Si ya es string, lo deja pasar.
        return v.simbolo if hasattr(v, "simbolo") else str(v)


# ESQUEMAS DE EQUIPOS DEL PASO
class PasoEquipoBase(BaseModel):
    equipo_id: Annotated[int, Field(gt=0)]
    cantidad: Annotated[int, Field(default=1, gt=0, description="Cantidad de este equipo necesaria para el paso")]

class PasoEquipoCreate(PasoEquipoBase):
    pass

class PasoEquipoOut(PasoEquipoBase):
    id: int
    paso_id: int
    equipo: EquipoResumenOut
    model_config = ConfigDict(from_attributes=True)


# ESQUEMAS DE INSUMOS DEL PASO
class PasoInsumoBase(BaseModel):
    insumo_id: Annotated[int, Field(gt=0)]
    cantidad_consumo_estimada: Annotated[float, Field(gt=0, description="Cantidad estimada a consumir en este paso")]

class PasoInsumoCreate(PasoInsumoBase):
    pass

class PasoInsumoOut(PasoInsumoBase):
    id: int
    paso_id: int
    insumo: InsumoResumenOut
    model_config = ConfigDict(from_attributes=True)


# ESQUEMAS DE PASO DE RECETA
class PasoRecetaBase(BaseModel):
    numero_orden: Annotated[int, Field(gt=0, description="Posición cronológica del paso en la receta")]
    titulo: Annotated[str, Field(min_length=3, max_length=100)]
    instrucciones: Annotated[str, Field(min_length=5)]

class PasoRecetaCreate(PasoRecetaBase):
    equipos: Annotated[List[PasoEquipoCreate], Field(default_factory=list)]
    insumos: Annotated[List[PasoInsumoCreate], Field(default_factory=list)]

class PasoRecetaUpdate(BaseModel):
    numero_orden: Annotated[Optional[int], Field(default=None, gt=0)]
    titulo: Annotated[Optional[str], Field(default=None, min_length=3, max_length=100)]
    instrucciones: Annotated[Optional[str], Field(default=None, min_length=5)]
    
    equipos: Annotated[Optional[List[PasoEquipoCreate]], Field(default=None)]
    insumos: Annotated[Optional[List[PasoInsumoCreate]], Field(default=None)]

class PasoRecetaOut(PasoRecetaBase):
    id: int
    receta_id: int
    equipos: List[PasoEquipoOut] = []
    insumos: List[PasoInsumoOut] = []
    model_config = ConfigDict(from_attributes=True)


# ESQUEMAS DE RECETA
class UnidadMedidaResumen(BaseModel):
    id: int
    nombre: str
    simbolo: str
    model_config = ConfigDict(from_attributes=True)


class ProductoResumenOut(BaseModel):
    id: int
    nombre: str
    activo: bool
    unidad_medida: Optional[UnidadMedidaResumen] = None
    model_config = ConfigDict(from_attributes=True)


class RecetaBase(BaseModel):
    nombre_receta: Annotated[str, Field(min_length=1, max_length=150)]
    rendimiento_estandar: Annotated[Decimal, Field(gt=0)]
    tiempo_estimado_total: Annotated[Optional[int], Field(default=None, gt=0)]
    observaciones: Annotated[Optional[str], Field(default=None)]

class RecetaCreate(RecetaBase):
    producto_id: Annotated[int, Field(gt=0)]

class RecetaUpdate(BaseModel):
    nombre_receta: Annotated[Optional[str], Field(default=None, min_length=1, max_length=150)]
    rendimiento_estandar: Annotated[Optional[Decimal], Field(default=None, gt=0)]
    tiempo_estimado_total: Annotated[Optional[int], Field(default=None, gt=0)]
    observaciones: Annotated[Optional[str], Field(default=None)]

class Receta(RecetaBase):
    id: int
    codigo_receta: str
    producto_id: int
    producto: Optional[ProductoResumenOut] = None
    producto_nombre: Optional[str] = None
    estado: EstadoReceta
    fecha_creacion: datetime
    fecha_baja: Optional[datetime] = None
    usuario_creador_id: int
    usuario_creador_nombre: Optional[str] = None
    tiene_lotes: bool = False
    
    pasos: List[PasoRecetaOut] = []
    
    model_config = ConfigDict(from_attributes=True)


class ItemComposicionPorcentualOut(BaseModel):
    insumo_id: int
    nombre: str
    categoria: str
    cantidad_nominal: float
    unidad_nominal: str
    masa_equivalente_g: Optional[float] = None
    porcentaje_mezcla: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class InsumoSinEquivalenciaOut(BaseModel):
    insumo_id: int
    nombre: str
    unidad_simbolo: str
    tipo_magnitud: str
    equivalencia_requerida: str
    mensaje: str
    model_config = ConfigDict(from_attributes=True)


class ComposicionPorcentualOut(BaseModel):
    receta_id: int
    codigo_receta: str
    nombre_receta: str
    estado_receta: EstadoReceta
    ingredientes: List[ItemComposicionPorcentualOut] = []
    aditivos: List[ItemComposicionPorcentualOut] = []
    peso_total_mezcla_g: float = 0.0
    suma_porcentajes: float = 0.0
    verificacion_100: bool = False
    es_completa: bool = True
    insumos_sin_equivalencia: List[InsumoSinEquivalenciaOut] = []
    model_config = ConfigDict(from_attributes=True)
