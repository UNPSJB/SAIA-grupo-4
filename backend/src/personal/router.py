from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from src.database import get_db
from src.personal import schemas, services

router = APIRouter(prefix="/personal", tags=["personal"])

@router.post("/", response_model=schemas.Persona, status_code=201)
def crear_persona(persona: schemas.PersonaCreate, db: Session = Depends(get_db)):
    return services.crear_persona(db, persona)

@router.get("/", response_model=list[schemas.Persona])
def read_personal(db: Session = Depends(get_db)):
    return services.listar_personal(db)

@router.get("/{persona_id}", response_model=schemas.Persona)
def read_persona(persona_id: int, db: Session = Depends(get_db)):
    return services.leer_persona(db, persona_id)

@router.post("/{persona_id}/vencimientos", response_model=schemas.VencimientoPersonal, status_code=201)
def crear_vencimiento(persona_id: int, vencimiento: schemas.VencimientoPersonalCreate, db: Session = Depends(get_db)):
    return services.crear_vencimiento(db, persona_id, vencimiento)

@router.patch("/{persona_id}/vencimientos/{vencimiento_id}", response_model=schemas.VencimientoPersonal)
def modificar_vencimiento(persona_id: int, vencimiento_id: int, vencimiento: schemas.VencimientoPersonalUpdate, db: Session = Depends(get_db)):
    return services.modificar_vencimiento(db, persona_id, vencimiento_id, vencimiento)

@router.post("/{persona_id}/vencimientos/{vencimiento_id}/comprobante", response_model=schemas.VencimientoPersonal)
def adjuntar_comprobante(persona_id: int, vencimiento_id: int, comprobante: UploadFile = File(...), db: Session = Depends(get_db)):
    return services.adjuntar_comprobante(db, persona_id, vencimiento_id, comprobante)

@router.put("/{persona_id}", response_model=schemas.Persona)
def update_persona(persona_id: int, persona: schemas.PersonaUpdate, db: Session = Depends(get_db)):
    return services.modificar_persona(db, persona_id, persona)

@router.delete("/{persona_id}", response_model=schemas.Persona)
def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    return services.eliminar_persona(db, persona_id)