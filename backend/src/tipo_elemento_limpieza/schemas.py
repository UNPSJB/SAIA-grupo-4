from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Annotated, Optional


class TipoElementoLimpiezaBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=50, description="El nombre del tipo de elemento es obligatorio")]
    prefijo: Annotated[str, Field(min_length=2, max_length=5, pattern=r"^[A-Z]+$", description="Prefijo en mayúsculas para generar el código de cada instancia (ej. ESC, CEP)")]
    activo: Annotated[bool, Field(default=True, description="Campo para verificar la baja logica")]


class TipoElementoLimpiezaCreate(TipoElementoLimpiezaBase):
    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_numerico(cls, v: str) -> str:
        if v.strip().isdigit():
            raise ValueError("El nombre no puede ser únicamente números")
        return v


class TipoElementoLimpiezaUpdate(BaseModel):
    nombre: Annotated[Optional[str], Field(default=None, min_length=1, max_length=50)]
    activo: Annotated[Optional[bool], Field(default=None)]

    @field_validator("nombre")
    @classmethod
    def validar_nombre_no_numerico(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip().isdigit():
            raise ValueError("El nombre no puede ser únicamente números")
        return v


class TipoElementoLimpiezaDelete(TipoElementoLimpiezaBase):
    pass


class TipoElementoLimpieza(TipoElementoLimpiezaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)