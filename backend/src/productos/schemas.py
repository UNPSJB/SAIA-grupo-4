from typing import Annotated, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
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
    activo: Annotated[Optional[bool], Field(default=None)]

    @field_validator("nombre", "descripcion", "unidad_medida_id", "activo", mode="before")
    @classmethod
    def rechazar_null_explicito(cls, valor):
        if valor is None:
            raise ValueError("El campo no puede ser null")
        return valor

class Producto(ProductoBase):
    id: int
    activo: bool
    unidad_medida: UnidadMedida

    model_config = ConfigDict(from_attributes=True)