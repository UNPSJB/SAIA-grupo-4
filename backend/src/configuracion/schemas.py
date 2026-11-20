import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

class ConfiguracionPublicaResponse(BaseModel):
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


class ConfiguracionSistemaResponse(ConfiguracionPublicaResponse):
    id: int
    razon_social: Optional[str] = None
    cuit: Optional[str] = None
    fecha_modificacion: datetime
    modificado_por_id: Optional[int] = None
    modificado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConfiguracionSistemaUpdate(BaseModel):
    nombre_establecimiento: str = Field(..., min_length=1, max_length=150)
    razon_social: Optional[str] = Field(default=None, max_length=150)
    cuit: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = Field(default=None, max_length=200)
    localidad: Optional[str] = Field(default=None, max_length=100)
    provincia: Optional[str] = Field(default=None, max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=150)
    sitio_web: Optional[str] = Field(default=None, max_length=200)
    pie_informes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("nombre_establecimiento", mode="before")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("El nombre del establecimiento no puede estar vacío.")
        return v

    @field_validator("cuit", mode="before")
    @classmethod
    def validar_cuit(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = str(v).replace("-", "").strip()
        if not limpio:
            return None
        if not re.fullmatch(r"\d{11}", limpio):
            raise ValueError("El CUIT debe contener exactamente 11 dígitos numéricos.")
        return limpio

    @field_validator("email", mode="before")
    @classmethod
    def validar_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = str(v).strip()
        if not limpio:
            return None
        if not re.fullmatch(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", limpio):
            raise ValueError("El formato del correo electrónico no es válido.")
        return limpio


ConfiguracionUpdate = ConfiguracionSistemaUpdate
ConfiguracionPublicaOut = ConfiguracionPublicaResponse
ConfiguracionSistemaOut = ConfiguracionSistemaResponse
ConfiguracionOut = ConfiguracionSistemaResponse

class ReglaUmbralFrontalInput(BaseModel):
    nutriente_critico: str = Field(..., min_length=1, max_length=50)
    leyenda_sello: str = Field(..., min_length=1, max_length=120)
    categoria: str = Field(..., min_length=1, max_length=30)
    valor_umbral: float = Field(..., gt=0, description="El umbral debe ser mayor a cero.")
    unidad_umbral: str = Field(..., min_length=1, max_length=60)
    condicion: Optional[str] = Field(default=None, max_length=255)


class ReglaUmbralFrontalResponse(ReglaUmbralFrontalInput):
    id: int
    version_id: int

    model_config = ConfigDict(from_attributes=True)


class VersionParametroFrontalCreate(BaseModel):
    normativa_referencia: str = Field(..., min_length=1, max_length=200)
    motivo_cambio: Optional[str] = Field(default=None, max_length=500)
    reglas: List[ReglaUmbralFrontalInput] = Field(..., min_length=1)

    @field_validator("normativa_referencia", mode="before")
    @classmethod
    def limpiar_normativa(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("La normativa de referencia es obligatoria.")
        return v


class VersionParametroFrontalResponse(BaseModel):
    id: int
    numero_version: int
    normativa_referencia: str
    motivo_cambio: Optional[str] = None
    estado: str
    fecha_vigencia_desde: datetime
    fecha_vigencia_hasta: Optional[datetime] = None
    creado_por_id: Optional[int] = None
    creado_por_nombre: Optional[str] = None
    reglas: List[ReglaUmbralFrontalResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ModuloOctogonosUpdate(BaseModel):
    octogonos_activos: bool
    observacion: Optional[str] = Field(default=None, max_length=255)


class ConfiguracionModuloResponse(BaseModel):
    id: int
    octogonos_activos: bool
    observacion: Optional[str] = None
    fecha_modificacion: datetime
    modificado_por_id: Optional[int] = None
    modificado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ParametrosFrontalesConsolidadoResponse(BaseModel):
    modulo: ConfiguracionModuloResponse
    version_vigente: VersionParametroFrontalResponse
    historial: List[VersionParametroFrontalResponse] = []