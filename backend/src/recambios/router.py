import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.recambios import schemas, services
from src.auth.dependencies import requiere_administracion


logger = logging.getLogger(__name__)

# Router protegido: cualquier request sin sesión válida con capacidad
# 'administrar' responde 401 (sin token) o 403 (token de no-admin).
router = APIRouter(prefix="/recambios", tags=["recambios"], dependencies=[Depends(requiere_administracion)])


@router.post("/", response_model=schemas.Recambio, status_code=201)
def registrar_recambio(recambio: schemas.RecambioCreate, db: Session = Depends(get_db)):
    return services.registrar_recambio(db, recambio)


@router.get("/alertas", response_model=list[schemas.AlertaRecambio])
def listar_alertas(db: Session = Depends(get_db)):
    return services.listar_alertas(db)


@router.get("/", response_model=list[schemas.Recambio])
def listar_historial(elemento_id: int, db: Session = Depends(get_db)):
    return services.listar_historial(db, elemento_id)
