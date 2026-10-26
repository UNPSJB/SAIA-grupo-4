from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.productos import schemas, services

# Definimos el prefijo de la URL para todos los endpoints de productos
router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("/", response_model=List[schemas.ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return services.listar_productos_activos(db)

@router.post("/", response_model=schemas.ProductoOut)
def crear_producto(producto_in: schemas.ProductoCreate, db: Session = Depends(get_db)):
    return services.crear_producto(db, producto_in)