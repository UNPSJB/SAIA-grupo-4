from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.lotes import schemas, services

router = APIRouter(prefix="/lotes", tags=["Lotes de Producción"])

@router.get("/", response_model=List[schemas.LoteOut])
def listar_lotes(db: Session = Depends(get_db)):
    return services.listar_lotes(db)

@router.post("/", response_model=schemas.LoteOut, status_code=status.HTTP_201_CREATED)
def crear_lote(lote_in: schemas.LoteCreate, db: Session = Depends(get_db)):
    return services.crear_lote(db, lote_in)

@router.post("/{lote_id}/insumos", response_model=schemas.LoteOut, status_code=status.HTTP_200_OK)
def asociar_insumos(
    lote_id: int,
    request: schemas.AsociarInsumosRequest,
    db: Session = Depends(get_db)
):
    return services.asociar_insumos_a_lote(db, lote_id, request)