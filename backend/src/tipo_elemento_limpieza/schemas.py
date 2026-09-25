from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional


class TipoElementoLimpiezaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del tipo de elemento es obligatorio")]
    prefijo: Annotated[str, Field(min_length=2, max_length=5, pattern=r"^[A-Z]+$", description="Prefijo en mayúsculas para generar el código de cada instancia (ej. ESC, CEP)")]
    activo: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]

class TipoElementoLimpiezaCreate(TipoElementoLimpiezaBase):
    pass

class TipoElementoLimpiezaUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50)]
    prefijo: Annotated[Optional[str], Field(default=None, min_length=2, max_length=5, pattern=r"^[A-Z]+$")]
    activo: Annotated[Optional[bool], Field(default=None)]

class TipoElementoLimpiezaDelete(TipoElementoLimpiezaBase):
    pass

class TipoElementoLimpieza(TipoElementoLimpiezaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)