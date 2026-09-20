from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumo_quimico import schemas, services

router = APIRouter(prefix="/insumo-quimico", tags=["insumo-quimico"])

@router.post("/", response_model=schemas.InsumoQuimico, status_code=201)
def create_insumo_quimico(insumo_quimico: schemas.InsumoQuimicoCreate, db: Session = Depends(get_db)):
    return services.crear_insumo_quimico(db, insumo_quimico)

@router.get("/", response_model=list[schemas.InsumoQuimico])
def read_insumos_quimicos(db: Session = Depends(get_db)):
    return services.listar_insumos_quimicos(db)

@router.get("/{insumo_quimico_id}", response_model=schemas.InsumoQuimico)
def read_insumo_quimico(insumo_quimico_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo_quimico(db, insumo_quimico_id)

@router.put("/{insumo_quimico_id}", response_model=schemas.InsumoQuimico)
def update_insumo_quimico(insumo_quimico_id: int, insumo_quimico: schemas.InsumoQuimicoUpdate, db: Session = Depends(get_db)):
    return services.modificar_insumo_quimico(db, insumo_quimico_id, insumo_quimico)

@router.delete("/{insumo_quimico_id}", response_model=schemas.InsumoQuimico)
def delete_insumo_quimico(insumo_quimico_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo_quimico(db, insumo_quimico_id)