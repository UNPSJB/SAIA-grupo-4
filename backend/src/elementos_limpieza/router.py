import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.elementos_limpieza import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/elementos-limpieza", tags=["elementos-limpieza"])

# Rutas para Elementos de Limpieza

@router.post("/", response_model=schemas.ElementoLimpieza, status_code=201)
def crear_elemento_limpieza(elemento: schemas.ElementoLimpiezaCreate, db: Session = Depends(get_db)):
    return services.crear_elemento_limpieza(db, elemento)

@router.get("/{elemento_id}", response_model=schemas.ElementoLimpieza)
def leer_elemento_limpieza(elemento_id: int, db: Session = Depends(get_db)):
    return services.leer_elemento_limpieza(db, elemento_id)

@router.get("/", response_model=list[schemas.ElementoLimpieza])
def listar_elementos_limpieza(db: Session = Depends(get_db)):
    return services.listar_elementos_limpieza(db)

@router.delete("/{elemento_id}", response_model=schemas.ElementoLimpieza)
def eliminar_elemento_limpieza(elemento_id: int, db: Session = Depends(get_db)):
    return services.eliminar_elemento_limpieza(db, elemento_id)

@router.put("/{elemento_id}", response_model=schemas.ElementoLimpieza)
def modificar_elemento_limpieza(elemento_id: int, elemento: schemas.ElementoLimpiezaUpdate, db: Session = Depends(get_db)):
    return services.modificar_elemento_limpieza(db, elemento_id, elemento)