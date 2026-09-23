from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional


class TipoElementoLimpiezaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del tipo de elemento es obligatorio")]
    activo: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]

class TipoElementoLimpiezaCreate(TipoElementoLimpiezaBase):
    pass

class TipoElementoLimpiezaUpdate(TipoElementoLimpiezaBase):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50)]
    activo: Annotated[Optional[bool], Field(default=None)]

class TipoElementoLimpiezaDelete(TipoElementoLimpiezaBase):
    pass

class TipoElementoLimpieza(TipoElementoLimpiezaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)