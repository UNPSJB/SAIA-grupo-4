import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from sqlalchemy.exc import IntegrityError
from typing import List
from fastapi import UploadFile
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from src.documentos.constants import TipoDocumentoEnum
from src.documentos.models import Documento, RevisionDocumento, VersionDocumento
from src.documentos import schemas, exceptions
from src.personal.models import Persona
from src.personal import exceptions as personal_exceptions

# Carpeta local de evidencias
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "documentos"
os.makedirs(UPLOAD_DIR, exist_ok=True)
UPLOAD_URL_PREFIX = "uploads/documentos"


def _validar_autor(db: Session, persona_id: int):
    """Valida que la persona que crea el documento/versión exista y esté activa."""
    autor = db.scalar(select(Persona).where(Persona.id == persona_id))
    if not autor:
        raise personal_exceptions.PersonaNoEncontrada()
    if not autor.activo:
        raise personal_exceptions.PersonaInactiva()

def _validar_codigo_unico(db: Session, codigo: str, documento_id: int | None = None, ofrecer_reactivacion: bool = False):
    if not codigo:
        return
    query = select(Documento).where(Documento.codigo == codigo)
    if documento_id:
        query = query.where(Documento.id != documento_id)

    existente = db.scalar(query)
    if not existente:
        return
    # Si el código pertenece a un documento dado de baja no se bloquea, se ofrece reactivarlo
    if ofrecer_reactivacion and not existente.activo:
        raise exceptions.CodigoDocumentoRequiereReactivacion(existente.id)
    raise exceptions.CodigoDocumentoDuplicado()
    
def _generar_codigo_documento(db: Session, tipo: TipoDocumentoEnum) -> str:
    """Genera un código correlativo automático según el tipo de documento."""
    
    # Mapeo de prefijos según el tipo
    prefijos = {
        TipoDocumentoEnum.MANUAL_BPM: "BPM",
        TipoDocumentoEnum.PROCEDIMIENTO: "POES",
        TipoDocumentoEnum.INSTRUCTIVO: "INS",
        TipoDocumentoEnum.PLANILLA: "PLA",
        TipoDocumentoEnum.OTRO: "DOC"
    }
    prefijo = prefijos.get(tipo, "DOC")

    # Se cuenta cuántos documentos de este mismo tipo existen (activos e inactivos)
    cantidad_existente = db.scalar(
        select(func.count()).select_from(Documento).where(Documento.tipo_documento == tipo)
    )
    siguiente_correlativo = (cantidad_existente or 0) + 1
    
    # Formato final: Ej "POES-0001"
    return f"{prefijo}-{siguiente_correlativo:04d}"

def _limpiar_nombre_archivo(filename: str) -> str:
    """Limpia el nombre del archivo para evitar inyecciones de path y caracteres inválidos."""
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

def _guardar_documento_local(archivo: UploadFile) -> str:
    if archivo.content_type != "application/pdf":
        raise exceptions.ArchivoInvalido(detail="El documento debe ser un archivo PDF.")
        
    hora_actual = datetime.now() 
    timestamp = hora_actual.strftime("%Y%m%d_%H%M%S")
    
    nombre_seguro = _limpiar_nombre_archivo(archivo.filename)
    nombre_archivo = f"doc_{timestamp}_{nombre_seguro}"

    with open(UPLOAD_DIR / nombre_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)
        
    return f"{UPLOAD_URL_PREFIX}/{nombre_archivo}"


def leer_documento(db: Session, documento_id: int) -> Documento:
    db_doc = db.scalar(select(Documento).where(Documento.id == documento_id))
    if not db_doc:
        raise exceptions.DocumentoNoEncontrado()
    return db_doc

def crear_documento(
    db: Session, 
    documento: schemas.DocumentoCreate, 
    archivo: UploadFile | None = None
) -> Documento:
    
    _validar_autor(db, documento.creado_por_id)
    # Si no viene código manual, se autogenera. Si viene, se respeta y se valida.
    if not documento.codigo:
        documento.codigo = _generar_codigo_documento(db, documento.tipo_documento)
    else:
        _validar_codigo_unico(db, documento.codigo, ofrecer_reactivacion=True)

    # Se crea el contenedor excluyendo los campos de la versión
    datos_doc = documento.model_dump(
        exclude={"version_inicial", "fecha_proxima_revision", "observaciones_cambio", "creado_por_id"}
    )
    nuevo_doc = Documento(**datos_doc, activo=True)
    db.add(nuevo_doc)
    db.flush()

    # Se crea la versión 1.0 SOLO si mandaron un PDF
    if archivo:
        ruta_archivo = _guardar_documento_local(archivo)
        
        primera_version = VersionDocumento(
            documento_id=nuevo_doc.id,
            version=documento.version_inicial,
            archivo_url=ruta_archivo,
            es_vigente=True,
            fecha_desde=datetime.now().date(),
            fecha_proxima_revision=documento.fecha_proxima_revision,
            observaciones_cambio=documento.observaciones_cambio,
            creado_por_id=documento.creado_por_id,
            fecha_subida=datetime.now()
        )
        db.add(primera_version)

    try:
        db.commit()
        db.refresh(nuevo_doc)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar el documento.")
    
    return nuevo_doc

def listar_documentos_activos(db: Session) -> List[Documento]:
    """Devuelve los documentos activos."""
    return db.scalars(select(Documento).where(Documento.activo == True)).all()

def listar_documentos(db: Session) -> List[Documento]:
    """Devuelve todos los documentos."""
    return db.scalars(select(Documento)).all()

def modificar_documento(db: Session, documento_id: int, documento: schemas.DocumentoUpdate) -> Documento:
    db_doc = leer_documento(db, documento_id)
    update_data = documento.model_dump(exclude_unset=True)

    if not db_doc.activo:
        # Si está inactivo, SOLO se permite reactivar
        if update_data != {"activo": True}:
            raise exceptions.DocumentoInactivo()
    else:
        # Se bloquea la baja por PATCH
        if update_data.get("activo") is False:
            raise exceptions.DocumentoBajaNoPermitida()

    if "codigo" in update_data:
        _validar_codigo_unico(db, update_data["codigo"], documento_id)

    if update_data:
        db.execute(update(Documento).where(Documento.id == documento_id).values(**update_data))
        
    try:
        db.commit()
        db.refresh(db_doc)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al actualizar el documento.")
    
    return db_doc

def eliminar_documento(db: Session, documento_id: int) -> Documento:
    db_doc = leer_documento(db, documento_id)
    db_doc.activo = False
    
    try:
        db.commit()
        db.refresh(db_doc)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al intentar dar de baja el documento.")
    
    return db_doc


def agregar_version(
    db: Session, 
    documento_id: int, 
    version_data: schemas.VersionDocumentoCreate, 
    archivo: UploadFile
) -> VersionDocumento:
    
    db_doc = leer_documento(db, documento_id)
    if not db_doc.activo:
        raise exceptions.DocumentoInactivo()
        
    _validar_autor(db, version_data.creado_por_id)
    ruta_archivo = _guardar_documento_local(archivo)

    nueva_version = VersionDocumento(
        **version_data.model_dump(),
        documento_id=documento_id,
        archivo_url=ruta_archivo,
        es_vigente=False,
        fecha_desde=datetime.now().date(),
        fecha_subida=datetime.now()
    )
    db.add(nueva_version)

    try:
        db.commit()
        db.refresh(nueva_version)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar la nueva versión.")
    
    return nueva_version

def marcar_version_vigente(db: Session, documento_id: int, version_id: int) -> Documento:
    db_doc = leer_documento(db, documento_id)
    if not db_doc.activo:
        raise exceptions.DocumentoInactivo()

    version_objetivo = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.id == version_id, 
            VersionDocumento.documento_id == documento_id
        )
    )
    if not version_objetivo:
        raise exceptions.VersionNoEncontrada()

    if version_objetivo.es_vigente:
        return db_doc 

    version_actual = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.documento_id == documento_id,
            VersionDocumento.es_vigente == True
        )
    )
    
    if version_actual:
        version_actual.es_vigente = False
        version_actual.fecha_hasta = datetime.now().date()

    version_objetivo.es_vigente = True
    version_objetivo.fecha_hasta = None 

    try:
        db.commit()
        db.refresh(db_doc)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al cambiar la vigencia.")
    
    return db_doc

def renovar_vigencia_version(
    db: Session, 
    documento_id: int, 
    version_id: int, 
    datos: schemas.VersionDocumentoRenovacion
) -> Documento:
    
    db_doc = leer_documento(db, documento_id)
    if not db_doc.activo:
        raise exceptions.DocumentoInactivo()

    version_objetivo = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.id == version_id, 
            VersionDocumento.documento_id == documento_id
        )
    )
    if not version_objetivo:
        raise exceptions.VersionNoEncontrada()

    # Se actualiza la nueva fecha de vencimiento SOLO si viene informada: una revisión puede limitarse a asentar notas sin mover el vencimiento.
    if datos.fecha_proxima_revision is not None:
        version_objetivo.fecha_proxima_revision = datos.fecha_proxima_revision

    # Cada revisión queda como fila propia en el historial de auditoría
    if datos.registrado_por_id:
        _validar_autor(db, datos.registrado_por_id)
    nueva_revision = RevisionDocumento(
        version_id=version_objetivo.id,
        nueva_fecha_proxima_revision=datos.fecha_proxima_revision,
        observaciones=datos.observaciones,
        registrado_por_id=datos.registrado_por_id,
    )
    db.add(nueva_revision)

    try:
        db.commit()
        db.refresh(db_doc)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al registrar la revisión.")
    
    return db_doc


def listar_revisiones_version(
    db: Session,
    documento_id: int,
    version_id: int
) -> List[RevisionDocumento]:
    """Historial de revisiones registradas sobre una versión (más reciente primero)."""
    version_objetivo = db.scalar(
        select(VersionDocumento).where(
            VersionDocumento.id == version_id,
            VersionDocumento.documento_id == documento_id
        )
    )
    if not version_objetivo:
        raise exceptions.VersionNoEncontrada()

    # La relación ya viene ordenada por fecha_registro descendente
    return version_objetivo.revisiones