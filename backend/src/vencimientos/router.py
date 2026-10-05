from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.vencimientos import schemas, services
from src.vencimientos.constants import CategoriaVencimiento, EstadoVencimiento

router = APIRouter(prefix="/vencimientos", tags=["vencimientos"])

# `dias_max` sin default: no mandar el parametro significa "sin corte", no
# "15 dias". Con el default en 15, "Todos los estados" recortaba justamente a los
# vigentes, que son los que quedan mas alla de ese umbral. Acortar la ventana
# ahora es una decision explicita del cliente.


# Categorias disponibles

@router.get("/categorias", response_model=list[schemas.CategoriaDisponible])
def listar_categorias(
    dias_max: int | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
):
    return services.listar_categorias(db, dias_max)


# Vista consolidada

@router.get("/", response_model=list[schemas.Vencimiento])
def listar_vencimientos(
    estado: EstadoVencimiento | None = None,
    categoria: CategoriaVencimiento | None = None,
    dias_max: int | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
):
    return services.listar_vencimientos(db, estado, categoria, dias_max)