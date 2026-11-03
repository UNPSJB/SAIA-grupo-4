import re
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from src.documentos.constants import ErrorCode, EstadoVencimiento, TipoDocumentoEnum

PATRON_VERSION = re.compile(r"^[vV]?(\d+)\.(\d+)$")


def parsear_version(valor: str) -> tuple[int, int]:
    """Extrae (mayor, menor) de una versión con formato '1.0' o 'v1.0'."""
    limpio = (valor or "").strip()
    match = PATRON_VERSION.match(limpio)
    if not match:
        raise ValueError(ErrorCode.VERSION_FORMATO_INVALIDO)
    mayor = int(match.group(1))
    menor = int(match.group(2))
    if (mayor, menor) < (1, 0):
        raise ValueError("El número de versión mínimo permitido es v1.0.")
    return mayor, menor


def normalizar_version(valor: str) -> str:
    """Valida y normaliza una versión al formato canónico 'vX.Y'."""
    mayor, menor = parsear_version(valor)
    return f"v{mayor}.{menor}"


class VersionDocumentoBase(BaseModel):
    version: str  # Ej: "v1.0", "v1.1"
    fecha_proxima_revision: date | None = None  # Opcional (activa alertas en Strategy)
    observaciones_cambio: str | None = None  # Opcional (motivo o detalle del cambio)

class VersionDocumentoCreate(VersionDocumentoBase):
    version: str | None = None
    creado_por_id: int
    # Nota: El archivo PDF se recibe mediante UploadFile / Form en el Router

    @field_validator("version")
    @classmethod
    def _validar_formato_version(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        return normalizar_version(v)
    
class VersionDocumentoRenovacion(BaseModel):
    # Schema exclusivo para extender la vigencia sin subir un archivo nuevo.
    # Ambos campos son opcionales pero se exige al menos uno
    fecha_proxima_revision: date | None = None
    observaciones: str | None = None
    registrado_por_id: int | None = None  # Auditoría: quién registró la revisión

    @model_validator(mode="after")
    def _requiere_al_menos_un_dato(self):
        if self.fecha_proxima_revision is None and not (self.observaciones or "").strip():
            raise ValueError("Debe indicar al menos la nueva fecha de revisión o una observación")
        return self

class VersionDocumento(VersionDocumentoBase):
    id: int
    documento_id: int
    creado_por_id: int  # Incorporado para auditoría
    subido_por_nombre: str | None = None  # Nombre completo del que subió la versión
    archivo_url: str
    es_vigente: bool  # Calculado y gestionado por el Backend
    fecha_desde: date  # Fecha de entrada en vigencia
    fecha_hasta: date | None = None  # Se completa cuando pasa a versión histórica
    fecha_subida: datetime

    model_config = ConfigDict(from_attributes=True)


class RevisionDocumento(BaseModel):
    # Una fila del historial de revisiones de una versión
    id: int
    version_id: int
    fecha_registro: datetime
    nueva_fecha_proxima_revision: date | None = None
    observaciones: str | None = None
    registrado_por_id: int | None = None
    registrado_por_nombre: str | None = None  # Nombre completo de quien revisó

    model_config = ConfigDict(from_attributes=True)


class DocumentoBase(BaseModel):
    codigo: str | None = None  # Ej: "POES-001" (Opcional)
    titulo: str  # Ej: "Sanitización de Equipos de Frío"
    tipo_documento: TipoDocumentoEnum  # Enum: MANUAL_BPM, PROCEDIMIENTO_POES, etc.
    descripcion: str | None = None  # Opcional

class DocumentoCreate(DocumentoBase):
    # Datos para crear el contenedor + su primera versión inicial en la misma acción
    version_inicial: str = "v1.0"
    fecha_proxima_revision: date | None = None
    observaciones_cambio: str | None = None
    creado_por_id: int

    @field_validator("version_inicial")
    @classmethod
    def _validar_version_inicial(cls, v: str) -> str:
        normalizada = normalizar_version(v)
        if normalizada != "v1.0":
            raise ValueError("La versión inicial de un documento nuevo debe ser v1.0.")
        return normalizada

class DocumentoUpdate(BaseModel):
    # Todos los campos opcionales para permitir actualización parcial (PATCH)
    codigo: str | None = None
    titulo: str | None = None
    tipo_documento: TipoDocumentoEnum | None = None
    descripcion: str | None = None
    activo: bool | None = None  # Permite dar de baja o reactivar el documento

class Documento(DocumentoBase):
    id: int
    activo: bool
    fecha_creacion: datetime
    version_vigente: VersionDocumento | None = None  # Se mapea con el @property

    model_config = ConfigDict(from_attributes=True)

class DocumentoDetalle(Documento):
    # Historial completo (para la vista del Administrador)
    versiones: list[VersionDocumento] = []

    model_config = ConfigDict(from_attributes=True)


class AlertaDocumento(BaseModel):
    # Alerta de vencimiento de la próxima revisión de la versión vigente de un documento.
    documento: Documento
    proxima_revision: date
    dias_restantes: int
    estado: EstadoVencimiento