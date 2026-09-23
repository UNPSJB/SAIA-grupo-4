import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.tipo_elemento_limpieza import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tipos-elemento-limpieza", tags=["tipos-elemento-limpieza"])

@router.post("/", response_model=schemas.TipoElementoLimpieza, status_code=201)
def crear_tipo_elemento_limpieza(tipo: schemas.TipoElementoLimpiezaCreate, db: Session = Depends(get_db)):
    return services.crear_tipo(db, tipo)

@router.get("/{tipo_id}", response_model=schemas.TipoElementoLimpieza)
def leer_tipo_elemento_limpieza(tipo_id: int, db: Session = Depends(get_db)):
    return services.leer_tipo(db, tipo_id)

@router.get("/", response_model=list[schemas.TipoElementoLimpieza])
def listar_tipos_elemento_limpieza(db: Session = Depends(get_db)):
    return services.listar_tipos(db)

@router.delete("/{tipo_id}", response_model=schemas.TipoElementoLimpieza)
def eliminar_tipo_elemento_limpieza(tipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tipo(db, tipo_id)

@router.put("/{tipo_id}", response_model=schemas.TipoElementoLimpieza)
def modificar_tipo_elemento_limpieza(tipo_id: int, tipo: schemas.TipoElementoLimpiezaUpdate, db: Session = Depends(get_db)):
    return services.modificar_tipo(db, tipo_id, tipo)