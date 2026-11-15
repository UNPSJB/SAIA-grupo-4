from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_administracion
from src.database import get_db
from src.rotulado import schemas, services

router = APIRouter(
    prefix="/recetas",
    tags=["rotulado"],
    dependencies=[Depends(requiere_administracion)],
)


@router.get(
    "/{receta_id}/aplicabilidad-frontal",
    response_model=schemas.AplicabilidadFrontalOut,
    summary="Evaluar aplicabilidad de rotulado frontal para una receta",
)
def obtener_aplicabilidad_frontal(
    receta_id: int,
    db: Session = Depends(get_db),
):
    """Evalúa si la normativa de rotulado frontal aplica a la receta según su comercialización y agregados."""
    return services.evaluar_aplicabilidad_frontal(db, receta_id)


@router.put(
    "/{receta_id}/aplicabilidad-frontal",
    response_model=schemas.AplicabilidadFrontalOut,
    summary="Actualizar o corregir manualmente agregados para rotulado frontal",
)
def actualizar_aplicabilidad_frontal(
    receta_id: int,
    payload: schemas.AplicabilidadFrontalIn,
    db: Session = Depends(get_db),
):
    """Permite corregir manualmente (overrides) los agregados de azúcares, grasas, sodio, edulcorantes o cafeína."""
    return services.actualizar_overrides_aplicabilidad(db, receta_id, payload)
