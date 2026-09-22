from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.capacidades import schemas, services

router = APIRouter(prefix="/capacidades", tags=["capacidades"])

# Rutas para Capacidad

@router.post("/", response_model=schemas.Capacidad, status_code=201)
def crear_capacidad(capacidad: schemas.CapacidadCreate, db: Session = Depends(get_db)):
    return services.crear_capacidad(db, capacidad)

@router.get("/", response_model=list[schemas.Capacidad])
def listar_capacidades(db: Session = Depends(get_db)):
    return services.listar_capacidades(db)

@router.get("/{capacidad_id}", response_model=schemas.Capacidad)
def leer_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.leer_capacidad(db, capacidad_id)

@router.put("/{capacidad_id}", response_model=schemas.Capacidad)
def modificar_capacidad(capacidad_id: int, capacidad: schemas.CapacidadUpdate, db: Session = Depends(get_db)):
    return services.modificar_capacidad(db, capacidad_id, capacidad)

@router.delete("/{capacidad_id}", response_model=schemas.Capacidad)
def delete_capacidad(capacidad_id: int, db: Session = Depends(get_db)):
    return services.eliminar_capacidad(db, capacidad_id)