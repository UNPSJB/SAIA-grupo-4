import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.recambios import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recambios", tags=["recambios"])


@router.post("/", response_model=schemas.Recambio, status_code=201)
def registrar_recambio(recambio: schemas.RecambioCreate, db: Session = Depends(get_db)):
    return services.registrar_recambio(db, recambio)


@router.get("/alertas", response_model=list[schemas.AlertaRecambio])
def listar_alertas(db: Session = Depends(get_db)):
    return services.listar_alertas(db)


@router.get("/", response_model=list[schemas.Recambio])
def listar_historial(elemento_id: int, db: Session = Depends(get_db)):
    return services.listar_historial(db, elemento_id)
