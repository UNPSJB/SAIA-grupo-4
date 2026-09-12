import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumos import schemas, services

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insumos", tags=["insumos"])

# Rutas para Insumos

@router.post("/", response_model=schemas.Insumo)
def crear_insumo(insumo: schemas.InsumoCreate, db: Session = Depends(get_db)):
    return services.crear_insumo(db, insumo)

@router.post("/{insumo_id}", response_model=schemas.Insumo)
def leer_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo(db, insumo_id)

@router.get("/", response_model=list[schemas.Insumo])
def listar_insumos(db: Session = Depends(get_db)):
    return services.listar_insumos(db)

@router.delete("/{insumo_id}", response_model=schemas.Insumo)
def eliminar_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo(db, insumo_id)

@router.put("/{insumo_id}", response_model=schemas.Insumo)
def modificar_insumo(insumo_id: int, persona: schemas.InsumoUpdate, db: Session = Depends(get_db)):
    return services.modificar_insumo(db, insumo_id, persona)
