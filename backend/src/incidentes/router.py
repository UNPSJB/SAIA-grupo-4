from fastapi import APIRouter
from sqlalchemy.orm import Session
from src.database import get_db
from src.incidentes import schemas, services

router = APIRouter(prefix="/incidentes", tags=["incidentes"])

@router.post("/", response_model=schemas.IncidenteBase, status_code=201)
def create_incidente(incidente: schemas.IncidenteCreate, db: Session = Depends(get_db)):
    return services.crear_incidente(db, incidente)

@router.get("/", response_model=list[schemas.IncidenteBase])
def read_incidentes(db: Session = Depends(get_db)):
    return services.listar_incidentes(db)