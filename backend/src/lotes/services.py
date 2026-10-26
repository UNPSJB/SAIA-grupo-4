from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.lotes.models import Lote
from src.lotes.schemas import LoteCreate
from src.productos.models import Producto

def crear_lote(db: Session, lote_in: LoteCreate):
    # Validación 1: La cantidad debe ser mayor a 0 
    if lote_in.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad producida debe ser mayor a cero")
    
    # Validación 2: El producto debe existir y estar activo
    producto = db.query(Producto).filter(Producto.id == lote_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="El producto seleccionado no existe")
    if not producto.activo:
        raise HTTPException(status_code=400, detail="El producto seleccionado está inactivo")

    nuevo_lote = Lote(**lote_in.model_dump())
    db.add(nuevo_lote)
    db.commit()
    db.refresh(nuevo_lote)
    return nuevo_lote

def listar_lotes(db: Session):
    # Traemos todos los lotes ordenados desde el más nuevo al más viejo
    return db.query(Lote).order_by(Lote.fecha.desc()).all()