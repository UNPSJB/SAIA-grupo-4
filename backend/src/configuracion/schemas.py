import re
from datetime import datetime
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from src.configuracion.constants import ErrorCode

class ConfiguracionBase(BaseModel):
    nombre_establecimiento: Annotated[str, Field(min_length=1, max_length=150)]
    razon_social: Annotated[Optional[str], Field(default=None, max_length=150)]
    cuit: Annotated[Optional[str], Field(default=None, max_length=11)]
    direccion: Annotated[Optional[str], Field(default=None, max_length=200)]
    localidad: Annotated[Optional[str], Field(default=None, max_length=100)]
    provincia: Annotated[Optional[str], Field(default=None, max_length=100)]
    telefono: Annotated[Optional[str], Field(default=None, max_length=50)]
    email: Annotated[Optional[EmailStr], Field(default=None, max_length=150)]
    sitio_web: Annotated[Optional[str], Field(default=None, max_length=200)]
    pie_informes: Annotated[Optional[str], Field(default=None, max_length=500)]

    @field_validator("nombre_establecimiento")
    @classmethod
    def validar_nombre_no_vacio(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre del establecimiento es obligatorio.")
        return limpio

    @field_validator("cuit", mode="before")
    @classmethod
    def validar_cuit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = str(v).strip().replace("-", "")
        if limpio == "":
            return None
        if not re.fullmatch(r"^\d{11}$", limpio):
            raise ValueError(ErrorCode.CUIT_INVALIDO)
        return limpio

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and str(v).strip() == "":
            return None
        return v

class ConfiguracionUpdate(ConfiguracionBase):
    pass

class ConfiguracionOut(ConfiguracionBase):
    id: int
    logo_url: Optional[str] = None
    fecha_modificacion: datetime
    modificado_por_id: Optional[int] = None
    modificado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ConfiguracionPublicaOut(BaseModel):
    nombre_establecimiento: str
    logo_url: Optional[str] = None
    direccion: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    pie_informes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)