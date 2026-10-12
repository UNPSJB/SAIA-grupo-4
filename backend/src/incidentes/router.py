import json
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session
from src.auth import dependencies
from src.database import get_db
from src.incidentes import schemas, services
from src.personal.models import Persona

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
def create_incidente(
    datos: str = Form(...),
    foto: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    try:
        datos_dict = json.loads(datos)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail="El campo 'datos' debe contener JSON válido.",
        ) from exc
    
    try:
        incidente = schemas.IncidenteCreate.model_validate(datos_dict)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors()
        ) from exc
    
    return services.crear_incidente(db, incidente, foto)

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

@router.get("/mis-reportes", response_model=list[schemas.Incidente])
def read_mis_incidentes(
    persona: Persona = Depends(dependencies.requiere_operacion),
    db: Session = Depends(get_db),
):
    return services.listar_incidentes_por_reportante(db, persona.id)

# Lista los incidentes abiertos
@router.get("/abiertos", response_model=list[schemas.Incidente])
def read_incidentes_abiertos(db: Session = Depends(get_db)):
    return services.listar_incidentes_abiertos(db)

# Lista los incidentes cerrados
@router.get("/cerrados", response_model=list[schemas.Incidente])
def read_incidentes_cerrados(db: Session = Depends(get_db)):
    return services.listar_incidentes_cerrados(db)

# Lista los incidentes abiertos agrupados por tipo como pide la E7
@router.get("/abiertos/por-tipo", response_model=list[schemas.IncidentesAbiertosPorTipo])
def read_incidentes_abiertos_por_tipo(db: Session = Depends(get_db)):
    return services.listar_incidentes_abiertos_por_tipo(db)

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