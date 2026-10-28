from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.productos import schemas, services
from src.productos.models import Producto

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("", response_model=List[schemas.ProductoOut])
@router.get("/", response_model=List[schemas.ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return services.listar_productos_activos(db)

@router.post("", response_model=schemas.ProductoOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(producto_in: schemas.ProductoCreate, db: Session = Depends(get_db)):
    return services.crear_producto(db, producto_in)