from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from src.documentos.constants import TipoDocumentoEnum


class VersionDocumentoBase(BaseModel):
    version: str  # Ej: "v1.0", "v1.1"
    fecha_proxima_revision: date | None = None  # Opcional (activa alertas en Strategy)
    observaciones_cambio: str | None = None  # Opcional (motivo o detalle del cambio)

class VersionDocumentoCreate(VersionDocumentoBase):
    creado_por_id: int
    # Nota: El archivo PDF se recibe mediante UploadFile / Form en el Router
    
class VersionDocumentoRenovacion(BaseModel):
    # Schema exclusivo para extender la vigencia sin subir un archivo nuevo
    fecha_proxima_revision: date
    observaciones: str | None = None

class VersionDocumento(VersionDocumentoBase):
    id: int
    documento_id: int
    creado_por_id: int  # Incorporado para auditoría
    archivo_url: str
    es_vigente: bool  # Calculado y gestionado por el Backend
    fecha_desde: date  # Fecha de entrada en vigencia
    fecha_hasta: date | None = None  # Se completa cuando pasa a versión histórica
    fecha_subida: datetime

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