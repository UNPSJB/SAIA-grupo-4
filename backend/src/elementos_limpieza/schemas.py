from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional

class ElementoLimpiezaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del elemento de limpieza es obligatorio")]
    frecuencia_recambio_dias: Annotated[Optional[int], Field(default=None, gt=0, description="Frecuencia de recambio recomendada, en días")]
    activo: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]

class ElementoLimpiezaCreate(ElementoLimpiezaBase):
    pass

class ElementoLimpiezaUpdate(ElementoLimpiezaBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50, description="El nombre del elemento de limpieza es obligatorio")]
    frecuencia_recambio_dias: Annotated[Optional[int], Field(default=None, gt=0, description="Frecuencia de recambio recomendada, en días")]
    activo: Annotated[Optional[bool], Field(default=None, description="Campo para verificar la baja logica")]

class ElementoLimpiezaDelete(ElementoLimpiezaBase):
    pass

class ElementoLimpieza(ElementoLimpiezaBase):
    id: int

model_config = ConfigDict(from_attributes=True)