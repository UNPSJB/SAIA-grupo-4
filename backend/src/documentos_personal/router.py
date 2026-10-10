from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.documentos_personal import schemas, services

router = APIRouter(prefix="/documentos-personal", tags=["documentos-personal"])

# Rutas para DocumentoPersonal

@router.post("/", response_model=schemas.DocumentoPersonal, status_code=201)
def crear_documento(documento: schemas.DocumentoPersonalCreate, db: Session = Depends(get_db)):
    return services.crear_documento(db, documento)

@router.get("/", response_model=list[schemas.DocumentoPersonal])
def listar_documentos(db: Session = Depends(get_db)):
    return services.listar_documentos(db)

@router.get("/{documento_id}", response_model=schemas.DocumentoPersonal)
def leer_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.leer_documento(db, documento_id)

@router.put("/{documento_id}", response_model=schemas.DocumentoPersonal)
def modificar_documento(documento_id: int, documento: schemas.DocumentoPersonalUpdate, db: Session = Depends(get_db)):
    return services.modificar_documento(db, documento_id, documento)

@router.delete("/{documento_id}", response_model=schemas.DocumentoPersonal)
def eliminar_documento(documento_id: int, db: Session = Depends(get_db)):
    return services.eliminar_documento(db, documento_id)
