from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from src.database import get_db
from src.lotes import schemas, services
from src.auth.dependencies import requiere_administracion, requiere_operacion

router = APIRouter(prefix="/lotes", tags=["Lotes de Producción"])

@router.get("/", response_model=List[schemas.LoteOut])
def listar_lotes(
    producto_id: Optional[int] = Query(default=None, description="Filtrar por ID de producto"),
    desde: Optional[date] = Query(default=None, description="Fecha desde (YYYY-MM-DD)"),
    hasta: Optional[date] = Query(default=None, description="Fecha hasta (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    # Requiere permisos de administrar para ver el historial consolidado,
    # aunque si el operador también lo necesita para su listado de alta rápida, 
    # podés reemplazar por requiere_operacion.
    _usuario = Depends(requiere_administracion) 
):
    return services.listar_lotes(db, producto_id=producto_id, desde=desde, hasta=hasta)

@router.post("/", response_model=schemas.LoteOut, status_code=status.HTTP_201_CREATED)
def crear_lote(
    lote_in: schemas.LoteCreate, 
    db: Session = Depends(get_db),
    _usuario = Depends(requiere_operacion)
):
    return services.crear_lote(db, lote_in)

@router.post("/{lote_id}/insumos", response_model=schemas.LoteOut, status_code=status.HTTP_200_OK)
def asociar_insumos(
    lote_id: int,
    request: schemas.AsociarInsumosRequest,
    db: Session = Depends(get_db),
    _usuario = Depends(requiere_operacion)
):
    return services.asociar_insumos_a_lote(db, lote_id, request)