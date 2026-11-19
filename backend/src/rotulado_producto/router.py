from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user, requiere_administracion
from src.database import get_db
from src.personal.models import Persona
from src.rotulado_producto import schemas, services

router = APIRouter(
    prefix="/productos",
    tags=["rotulado_producto"],
    dependencies=[Depends(requiere_administracion)],
)


@router.get(
    "/{producto_id}/rotulo",
    response_model=schemas.RotuloProductoConsolidadoOut,
    summary="Obtener datos del rótulo CAA de un producto con precarga automática",
)
def obtener_rotulo_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    """Devuelve el rótulo del producto, sus datos precargados desde la receta activa y el estado de completitud CAA."""
    return services.obtener_rotulo_producto(db, producto_id)


@router.get(
    "/{producto_id}/rotulo/vista-previa",
    response_model=schemas.VistaPreviaRotuloOut,
    summary="Obtener vista previa consolidada del borrador del rótulo CAA",
)
def obtener_vista_previa_rotulo(
    producto_id: int,
    db: Session = Depends(get_db),
):
    """Consolida los elementos del rótulo (E10, E11, E12 y E13), la leyenda de borrador y las advertencias."""
    return services.obtener_vista_previa_rotulo(db, producto_id)


@router.put(
    "/{producto_id}/rotulo",
    response_model=schemas.RotuloProductoConsolidadoOut,
    summary="Guardar o actualizar los datos del rótulo CAA de un producto",
)
def guardar_rotulo_producto(
    producto_id: int,
    payload: schemas.RotuloProductoUpdateIn,
    db: Session = Depends(get_db),
    current_user: Persona = Depends(get_current_user),
):
    """Guarda el rótulo del producto aceptando borradores parciales sin bloqueo por campos vacíos."""
    return services.guardar_rotulo_producto(
        db, producto_id, payload, current_user.id
    )
