from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.vencimientos import schemas, services
from src.vencimientos.constants import CategoriaVencimiento, FiltroEstadoVencimiento
from src.auth.dependencies import requiere_administracion

# Router protegido: cualquier request sin sesión válida con capacidad
# 'administrar' responde 401 (sin token) o 403 (token de no-admin).
router = APIRouter(prefix="/vencimientos", tags=["vencimientos"], dependencies=[Depends(requiere_administracion)])

# Dos parametros de dias, para dos usos distintos:
#
# - `dias_max` es una cota superior unilateral (`dias_restantes <= dias_max`).
#   Lo usa la campana de notificaciones con `estado=por_vencer&dias_max=15`.
#   Sin default: no mandarlo significa "sin corte", no "15 dias".
# - `dias_ventana` es la ventana simetrica del tablero (`abs(dias_restantes)
#   <= dias_ventana`): acota igual hacia el pasado y hacia el futuro, asi que
#   tiene efecto en todos los estados, incluido "vigente". Sin default.
#
# En ambos casos acortar la ventana es una decision explicita del cliente: un
# tope implicito en DIAS_AVISO_PROXIMO dejaba fuera a los vigentes y "Todos los
# estados" no podia mostrarlos.


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
    estado: FiltroEstadoVencimiento | None = None,
    categoria: CategoriaVencimiento | None = None,
    dias_max: int | None = Query(default=None, ge=0),
    dias_ventana: int | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
):
    return services.listar_vencimientos(db, estado, categoria, dias_max, dias_ventana)