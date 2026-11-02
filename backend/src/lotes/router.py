from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.auth import services as auth_services
from src.auth.dependencies import get_current_user, requiere_administracion, requiere_operacion
from src.capacidades.constants import RolesSistema
from src.exceptions import PermissionDenied
from src.database import get_db
from src.lotes import schemas, services
from src.personal.models import Persona

router = APIRouter(prefix="/lotes", tags=["Lotes de Producción"])


@router.get(
    "/productos-disponibles",
    response_model=List[schemas.ProductoDisponibleLoteOut],
    dependencies=[Depends(requiere_operacion)],
)
def listar_productos_disponibles(db: Session = Depends(get_db)):
    """Lista todos los productos activos con receta ACTIVA e insumos teóricos para el alta de lote."""
    return services.listar_productos_con_receta_activa(db)


@router.get(
    "/sugerir-codigo",
    response_model=dict,
    dependencies=[Depends(requiere_operacion)],
)
def sugerir_codigo(
    producto_id: int,
    fecha: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Calcula y sugiere el código del lote según formato LOT-{PREFIJO}-{YYYYMMDD}-{SEC}."""
    fecha_ref = fecha or date.today()
    codigo = services.sugerir_codigo_lote(db, producto_id, fecha_ref)
    return {"codigo_lote": codigo}


@router.post(
    "/",
    response_model=schemas.Lote,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requiere_operacion)],
)
def registrar_lote(
    lote_in: schemas.LoteCreate,
    db: Session = Depends(get_db),
    current_user: Persona = Depends(get_current_user),
):
    """Registra la producción de un lote sellando el operador en sesión y la receta activa actual."""
    return services.crear_lote(db, lote_in, current_user.id)


@router.get(
    "/mis-lotes",
    response_model=List[schemas.Lote],
    dependencies=[Depends(requiere_operacion)],
)
def listar_mis_lotes(
    busqueda: Optional[str] = None,
    producto_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Persona = Depends(get_current_user),
):
    """Lista únicamente los lotes producidos por el operador actualmente autenticado."""
    return services.listar_lotes_por_operador(
        db,
        operador_id=current_user.id,
        busqueda=busqueda,
        producto_id=producto_id,
        desde=desde,
        hasta=hasta,
    )


@router.get(
    "/",
    response_model=List[schemas.Lote],
    dependencies=[Depends(requiere_administracion)],
)
def listar_historial_general(
    busqueda: Optional[str] = None,
    producto_id: Optional[int] = None,
    receta_id: Optional[int] = None,
    operador_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Historial general de auditoría para administradores con filtros avanzados."""
    return services.listar_historial_lotes(
        db,
        busqueda=busqueda,
        producto_id=producto_id,
        receta_id=receta_id,
        operador_id=operador_id,
        desde=desde,
        hasta=hasta,
    )


@router.get(
    "/{lote_id}",
    response_model=schemas.Lote,
    dependencies=[Depends(requiere_operacion)],
)
def obtener_detalle_lote(
    lote_id: int,
    db: Session = Depends(get_db),
    current_user: Persona = Depends(get_current_user),
):
    """Obtiene el detalle completo de un lote. Si el usuario no es admin, solo puede ver sus propios lotes."""
    lote = services.obtener_lote_por_id(db, lote_id)
    activas = auth_services.nombres_capacidades_activas(db, current_user.id)
    es_admin = RolesSistema.ADMINISTRAR in activas
    if not es_admin and lote.operador_id != current_user.id:
        raise PermissionDenied()
    return lote
