from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from src.productos.models import Producto
from src.productos.schemas import ProductoCreate

def listar_productos_activos(db: Session):
    return db.query(Producto).filter(Producto.activo == True).all()

def crear_producto(db: Session, producto_in: ProductoCreate):
    # verifica que no exista otro con el mismo nombre distingue mayúsculas y minúsculas
    nombre_normalizado = producto_in.nombre.strip().lower()
    existe = db.query(Producto).filter(
        func.lower(func.trim(Producto.nombre)) == nombre_normalizado
    ).first()
    
    if existe:
        if not existe.activo:
            raise HTTPException(
                status_code=409, 
                detail="El producto '{existe.nombre}' ya existe pero se encuentra inactivo. Por favor, actívelo en lugar de crear uno nuevo."
            )
        raise HTTPException(
            status_code=400, 
            detail="Ya existe un producto registrado con ese nomnbre. Por favor, elija otro nombre.")
    
    nuevo_producto = Producto(nombre=producto_in.nombre.strip(), activo=True) 
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto