from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.vencimientos import schemas, services
from src.vencimientos.constants import CategoriaVencimiento, Constantes, EstadoVencimiento

router = APIRouter(prefix="/vencimientos", tags=["vencimientos"])


# Categorias disponibles

@router.get("/categorias", response_model=list[schemas.CategoriaDisponible])
def listar_categorias(
    dias_max: int | None = Query(default=Constantes.DIAS_AVISO_PROXIMO, ge=0),
    db: Session = Depends(get_db),
):
    return services.listar_categorias(db, dias_max)


# Vista consolidada

@router.get("/", response_model=list[schemas.Vencimiento])
def listar_vencimientos(
    estado: EstadoVencimiento | None = None,
    categoria: CategoriaVencimiento | None = None,
    dias_max: int | None = Query(default=Constantes.DIAS_AVISO_PROXIMO, ge=0),
    db: Session = Depends(get_db),
):
    return services.listar_vencimientos(db, estado, categoria, dias_max)