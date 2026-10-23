from typing import Annotated, Optional
from pydantic import BaseModel, Field, ConfigDict
from src.unidad_medida.schemas import UnidadMedida

class ProductoBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=100)]
    descripcion: Annotated[str, Field(min_length=1, max_length=250)]
    unidad_medida_id: Annotated[int, Field(gt=0)]

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(ProductoBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=100)]
    descripcion: Annotated[Optional[str], Field(default=None, min_length=1, max_length=250)]
    unidad_medida_id: Annotated[Optional[int], Field(default=None, gt=0)]

class Producto(ProductoBase):
    id: int
    activo: bool
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)