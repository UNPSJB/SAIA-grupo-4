from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.sectores import schemas, services

router = APIRouter(prefix="/sectores", tags=["sectores"])

@router.post("/", response_model=schemas.Sector, status_code=201)
def create_sector(sector: schemas.SectorCreate, db: Session = Depends(get_db)):
    return services.crear_sector(db, sector)

@router.get("/", response_model=List[schemas.Sector])
def read_sectores(db: Session = Depends(get_db)):
    return services.listar_sectores(db)

@router.get("/{sector_id}", response_model=schemas.Sector)
def read_sector(sector_id: int, db: Session = Depends(get_db)):
    return services.leer_sector(db, sector_id)

@router.put("/{sector_id}", response_model=schemas.Sector)
def update_sector(sector_id: int, sector: schemas.SectorUpdate, db: Session = Depends(get_db)):
    return services.modificar_sector(db, sector_id, sector)

@router.delete("/{sector_id}", response_model=schemas.Sector)
def delete_sector(sector_id: int, db: Session = Depends(get_db)):
    return services.eliminar_sector(db, sector_id)