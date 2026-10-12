import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.tipo_incidente import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tipos-incidente", tags=["tipos-incidente"])

@router.post("/", response_model=schemas.TipoIncidente, status_code=201)
def crear_tipo_incidente(tipo: schemas.TipoIncidenteCreate, db: Session = Depends(get_db)):
    return services.crear_tipo(db, tipo)

@router.get("/{tipo_id}", response_model=schemas.TipoIncidente)
def leer_tipo_incidente(tipo_id: int, db: Session = Depends(get_db)):
    return services.leer_tipo(db, tipo_id)

@router.get("/", response_model=list[schemas.TipoIncidente])
def listar_tipos_incidente(db: Session = Depends(get_db)):
    return services.listar_tipos(db)

@router.delete("/{tipo_id}", response_model=schemas.TipoIncidente)
def eliminar_tipo_incidente(tipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_tipo(db, tipo_id)

@router.put("/{tipo_id}", response_model=schemas.TipoIncidente)
def modificar_tipo_incidente(tipo_id: int, tipo: schemas.TipoIncidenteUpdate, db: Session = Depends(get_db)):
    return services.modificar_tipo(db, tipo_id, tipo)