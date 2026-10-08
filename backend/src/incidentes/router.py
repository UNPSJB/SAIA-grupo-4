from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.incidentes import schemas, services

router = APIRouter(prefix="/incidentes", tags=["incidentes"])

DesdeQuery = Annotated[
    date | None,
    Query(description="Fecha desde (inclusive). Formato: AAAA-MM-DD", examples=["2026-10-01"]),
]
HastaQuery = Annotated[
    date | None,
    Query(description="Fecha hasta (inclusive). Formato: AAAA-MM-DD", examples=["2026-10-08"]),
]
TipoIdQuery = Annotated[
    int | None,
    Query(description="Filtra por el id del tipo de incidente", examples=[1]),
]

@router.post("/", response_model=schemas.Incidente, status_code=201)
def create_incidente(incidente: schemas.IncidenteCreate, db: Session = Depends(get_db)):
    return services.crear_incidente(db, incidente)

# Listado con filtros opcionales
@router.get("/", response_model=list[schemas.Incidente])
def read_incidentes(
    tipo_id: TipoIdQuery = None,
    desde: DesdeQuery = None,
    hasta: HastaQuery = None,
    db: Session = Depends(get_db),
):
    return services.listar_incidentes(db, tipo_id, desde, hasta)

# Estadística por tipo (tiene que ir ANTES de "/{incidente_id}")
@router.get("/estadisticas", response_model=list[schemas.EstadisticaTipoIncidente])
def read_estadisticas(
    desde: DesdeQuery = None,
    hasta: HastaQuery = None,
    db: Session = Depends(get_db),
):
    return services.obtener_estadisticas_por_tipo(db, desde, hasta)

# Lee un único incidente
@router.get("/{incidente_id}", response_model=schemas.Incidente, status_code=200)
def read_incidente(incidente_id: int, db: Session = Depends(get_db)):
    return services.obtener_incidente_por_id(db, incidente_id)

# --- Novedades Cierre / Reapertura / Historial ---

@router.post("/{incidente_id}/cierre", response_model=schemas.Incidente)
def registrar_cierre(
    incidente_id: int,
    datos: schemas.IncidenteCierreCreate,
    db: Session = Depends(get_db)
):
    return services.cerrar_incidente(db, incidente_id, datos)

@router.post("/{incidente_id}/reapertura", response_model=schemas.Incidente)
def reabrir_incidente(
    incidente_id: int,
    datos: schemas.IncidenteReaperturaCreate,
    db: Session = Depends(get_db)
):
    return services.reabrir_incidente(db, incidente_id, datos)

@router.get("/{incidente_id}/historial", response_model=list[schemas.HistorialIncidenteResponse])
def obtener_historial(incidente_id: int, db: Session = Depends(get_db)):
    return services.listar_historial_incidente(db, incidente_id)