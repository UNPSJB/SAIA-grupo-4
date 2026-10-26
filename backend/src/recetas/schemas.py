from datetime import datetime
from decimal import Decimal
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.recetas.constants import EstadoReceta


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
    estado: EstadoReceta
    fecha_creacion: datetime
    usuario_creador_id: int
    usuario_creador_nombre: Optional[str] = None
    tiene_lotes: bool = False
    pasos: List = []
    model_config = ConfigDict(from_attributes=True)