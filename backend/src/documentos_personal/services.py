from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.documentos_personal.models import DocumentoPersonal
from src.documentos_personal import schemas, exceptions

def crear_documento(db: Session, documento: schemas.DocumentoPersonalCreate) -> DocumentoPersonal:
    documento_existente = db.scalar(select(DocumentoPersonal).where(DocumentoPersonal.nombre == documento.nombre))
    if documento_existente:
        if not documento_existente.activo:
            raise exceptions.DocumentoPersonalRequiereReactivacion(documento_existente.id)
        raise exceptions.DocumentoPersonalDuplicado()

    db_documento = DocumentoPersonal(**documento.model_dump(), activo=True)
    db.add(db_documento)
    try:
        db.commit()
        db.refresh(db_documento)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar el documento de personal.")
    return db_documento

def listar_documentos(db: Session) -> List[DocumentoPersonal]:
    return db.scalars(select(DocumentoPersonal)).all()

def leer_documento(db: Session, documento_id: int) -> DocumentoPersonal:
    db_documento = db.scalar(select(DocumentoPersonal).where(DocumentoPersonal.id == documento_id))
    if not db_documento:
        raise exceptions.DocumentoPersonalNoEncontrado()
    return db_documento

def modificar_documento(db: Session, documento_id: int, documento: schemas.DocumentoPersonalUpdate) -> DocumentoPersonal:
    db_documento = leer_documento(db, documento_id)
    update_data = documento.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        duplicado = db.scalar(select(DocumentoPersonal).where(DocumentoPersonal.nombre == update_data["nombre"], DocumentoPersonal.id != documento_id))
        if duplicado:
            if not duplicado.activo:
                raise exceptions.DocumentoPersonalRequiereReactivacion(duplicado.id)
            raise exceptions.DocumentoPersonalDuplicado()

    if update_data:
        db.execute(update(DocumentoPersonal).where(DocumentoPersonal.id == documento_id).values(**update_data))
        try:
            db.commit()
            db.refresh(db_documento)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(detail="Error de integridad al actualizar el documento de personal.")

    return db_documento

def eliminar_documento(db: Session, documento_id: int) -> DocumentoPersonal:
    db_documento = leer_documento(db, documento_id)

    # Baja logica. Se permite aunque haya vencimientos cargados: no se le pueden cargar nuevos
    # (ver crear_vencimiento en personal), y los existentes se conservan.
    db_documento.activo = False
    try:
        db.commit()
        db.refresh(db_documento)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al eliminar el documento de personal.")

    return db_documento
