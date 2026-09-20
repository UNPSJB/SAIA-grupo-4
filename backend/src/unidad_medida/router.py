import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.unidad_medida import schemas, services

# Creamos un logger para este módulo específico. Más info.: https://docs.python.org/3/library/logging.html
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unidades-de-medida", tags=["unidades-de-medida"])

# Rutas para Unidades de Medida

@router.post("/", response_model=schemas.UnidadMedida, status_code=201)
def crear_unidad_medida(unidad: schemas.UnidadMedidaCreate, db: Session = Depends(get_db)):
    return services.crear_unidad_medida(db, unidad)

@router.get("/", response_model=list[schemas.UnidadMedida])
def listar_unidades_de_medida(db: Session = Depends(get_db)):
    return services.listar_unidades_de_medida(db)

@router.get("/{unidad_medida_id}", response_model=schemas.UnidadMedida)
def leer_unidad_medida(unidad_medida_id: int, db: Session = Depends(get_db)):
    return services.leer_unidad_medida(db, unidad_medida_id)

@router.put("/{unidad_medida_id}", response_model=schemas.UnidadMedida)
def modificar_unidad_medida(unidad_medida_id: int, unidad: schemas.UnidadMedidaUpdate, db: Session = Depends(get_db)):
    return services.modificar_unidad_medida(db, unidad_medida_id, unidad)

@router.delete("/{unidad_medida_id}", response_model=schemas.UnidadMedida)
def eliminar_unidad_medida(unidad_medida_id: int, db: Session = Depends(get_db)):
    return services.eliminar_unidad_medida(db, unidad_medida_id)