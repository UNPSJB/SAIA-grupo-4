"""Endpoints administrativos y públicos de la vista pública."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_administracion
from src.database import get_db

from src.vista_publica import schemas, services


router = APIRouter(
    prefix="/vista-publica",
    tags=["vista-publica"],
    dependencies=[Depends(requiere_administracion)],
)

# Router sin autenticación: solo expone indicadores agregados de un token válido.
router_publico = APIRouter(
    prefix="/publico",
    tags=["vista-publica-publica"],
)


def _sin_cache(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"


@router.get("/", response_model=schemas.VistaPublicaEstado)
def obtener_estado(
    response: Response,
    db: Session = Depends(get_db),
):
    _sin_cache(response)
    return services.obtener_estado(db)


@router.put("/", response_model=schemas.VistaPublicaEstado)
def actualizar_estado(
    payload: schemas.VistaPublicaUpdate,
    response: Response,
    db: Session = Depends(get_db),
):
    _sin_cache(response)
    return services.actualizar_estado(db, payload.activo)


@router.put("/indicadores", response_model=schemas.VistaPublicaEstado)
def actualizar_indicadores(
    payload: schemas.IndicadoresUpdate,
    response: Response,
    db: Session = Depends(get_db),
):
    _sin_cache(response)
    return services.actualizar_indicadores(db, payload.activos)


@router_publico.get(
    "/{token}/indicadores",
    response_model=schemas.RespuestaIndicadoresPublicos,
    response_model_exclude_none=True,
)
def obtener_indicadores_publicos(
    token: str,
    response: Response,
    db: Session = Depends(get_db),
):
    _sin_cache(response)
    return services.obtener_indicadores_publicos(db, token)
