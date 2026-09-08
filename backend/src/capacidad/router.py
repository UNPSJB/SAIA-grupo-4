from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.capacidad import schemas, services

router = APIRouter(
    prefix="/capacidades",
    tags=["capacidades"]
)


@router.post("/", response_model=schemas.Capacidad)
def create_capacidad(
    capacidad: schemas.CapacidadCreate,
    db: Session = Depends(get_db)
):
    return services.crear_capacidad(db, capacidad)


@router.get("/", response_model=list[schemas.Capacidad])
def read_capacidades(db: Session = Depends(get_db)):
    return services.listar_capacidades(db)


@router.get("/{capacidad_id}", response_model=schemas.Capacidad)
def read_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.leer_capacidad(db, capacidad_id)

