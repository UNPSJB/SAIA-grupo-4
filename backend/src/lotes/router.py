from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.lotes import schemas, services

router = APIRouter(prefix="/lotes", tags=["Lotes de Producción"])

@router.get("/", response_model=List[schemas.LoteOut])
def listar_lotes(db: Session = Depends(get_db)):
    return services.listar_lotes(db)

@router.post("/", response_model=schemas.LoteOut)
def crear_lote(lote_in: schemas.LoteCreate, db: Session = Depends(get_db)):
    return services.crear_lote(db, lote_in)