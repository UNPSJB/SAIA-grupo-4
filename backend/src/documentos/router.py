import json
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session
from pydantic import ValidationError

from src.database import get_db
from src.documentos import schemas, services, exceptions

router = APIRouter(prefix="/documentos", tags=["documentos"])

# ENDPOINTS de Documentos

@router.get("/activos", response_model=list[schemas.Documento])
def listar_documentos_activos(db: Session = Depends(get_db)):
    """Devuelve solo los documentos activos y su versión vigente."""
    return services.listar_documentos_activos(db)


@router.get("/", response_model=list[schemas.DocumentoDetalle])
def listar_documentos(db: Session = Depends(get_db)):
    """Devuelve todos los documentos con su historial completo."""
    return services.listar_documentos(db)


@router.get("/{documento_id}", response_model=schemas.DocumentoDetalle)
def leer_documento(documento_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle completo de un documento específico y su historial."""
    return services.leer_documento(db, documento_id)


@router.post("/", response_model=schemas.DocumentoDetalle, status_code=status.HTTP_201_CREATED)
def crear_documento(
    datos: str = Form(..., description="String JSON con codigo, titulo, tipo_documento, version_inicial y creado_por_id"),
    # El archivo es opcional. Si no se envía, el documento nace "Pendiente de versión".
    archivo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db)
):
    """Crea el contenedor del documento. Si se envía el PDF, asienta la versión 1.0."""
    try:
        datos_dict = json.loads(datos)
        datos_schema = schemas.DocumentoCreate(**datos_dict)
    except json.JSONDecodeError:
        raise exceptions.FormatoJSONInvalido()
    except ValidationError as e:
        raise exceptions.DatosValidacionError(errores=e.errors())

    return services.crear_documento(db, datos_schema, archivo)


@router.patch("/{documento_id}", response_model=schemas.Documento)
def modificar_documento(
    documento_id: int, 
    documento: schemas.DocumentoUpdate, 
    db: Session = Depends(get_db)
):
    """Actualiza metadatos del documento. Solo permite reactivar si está inactivo."""
    return services.modificar_documento(db, documento_id, documento)


@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_documento(documento_id: int, db: Session = Depends(get_db)):
    """Baja lógica del documento."""
    services.eliminar_documento(db, documento_id)
    return None

# ENDPOINTS de Versiones

@router.post("/{documento_id}/versiones", response_model=schemas.VersionDocumento, status_code=status.HTTP_201_CREATED)
def agregar_version(
    documento_id: int,
    datos: str = Form(..., description="String JSON con version, fecha_proxima_revision, observaciones y creado_por_id"),
    # Para una NUEVA versión, el archivo sí es obligatorio.
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Sube una nueva versión a un documento existente. Ingresa como NO vigente."""
    try:
        datos_dict = json.loads(datos)
        datos_schema = schemas.VersionDocumentoCreate(**datos_dict)
    except json.JSONDecodeError:
        raise exceptions.FormatoJSONInvalido()
    except ValidationError as e:
        raise exceptions.DatosValidacionError(errores=e.errors())

    return services.agregar_version(db, documento_id, datos_schema, archivo)


@router.patch("/{documento_id}/versiones/{version_id}/vigencia", response_model=schemas.DocumentoDetalle)
def marcar_version_vigente(
    documento_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Activa una versión específica y archiva automáticamente la que estaba vigente."""
    return services.marcar_version_vigente(db, documento_id, version_id)

@router.patch("/{documento_id}/versiones/{version_id}/renovar", response_model=schemas.DocumentoDetalle)
def renovar_revision_version(
    documento_id: int,
    version_id: int,
    datos: schemas.VersionDocumentoRenovacion,
    db: Session = Depends(get_db)
):
    """
    Registra una revisión del documento (Ej: revisión anual). 
    Extiende su fecha de próximo vencimiento sin crear una nueva versión física.
    """
    return services.renovar_vigencia_version(db, documento_id, version_id, datos)