from sqlalchemy.orm import Session
from fastapi import HTTPException
from src.productos.models import Producto
from src.productos.schemas import ProductoCreate

def listar_productos_activos(db: Session):
    return db.query(Producto).filter(Producto.activo == True).all()

def crear_producto(db: Session, producto_in: ProductoCreate):
    # Verificamos que no exista otro con el mismo nombre
    existe = db.query(Producto).filter(Producto.nombre == producto_in.nombre).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese nombre")
    
    nuevo_producto = Producto(**producto_in.model_dump())
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto