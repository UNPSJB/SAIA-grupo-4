from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from src.database import get_db
from src.equipos import schemas, services
from src.auth.dependencies import requiere_administracion

# Router protegido: cualquier request sin sesión válida con capacidad
# 'administrar' responde 401 (sin token) o 403 (token de no-admin).
router = APIRouter(prefix="/equipos", tags=["equipos"], dependencies=[Depends(requiere_administracion)])

@router.post("/", response_model=schemas.Equipo, status_code=201)
def create_equipo(equipo: schemas.EquipoCreate, db: Session = Depends(get_db)):
    return services.crear_equipo(db, equipo)

@router.get("/", response_model=list[schemas.Equipo])
def read_equipos(db: Session = Depends(get_db)):
    return services.listar_equipos(db)

@router.get("/{equipo_id}", response_model=schemas.Equipo)
def read_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.leer_equipo(db, equipo_id)

@router.put("/{equipo_id}", response_model=schemas.Equipo)
def update_equipo(equipo_id: int, equipo: schemas.EquipoUpdate, db: Session = Depends(get_db)):
    return services.modificar_equipo(db, equipo_id, equipo)

@router.delete("/{equipo_id}", response_model=schemas.Equipo)
def delete_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_equipo(db, equipo_id)

@router.post(
    "/{equipo_id}/calibraciones",
    response_model=schemas.CalibracionEquipo,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar calibración realizada en un equipo con certificado opcional",
)
def registrar_calibracion_equipo(
    equipo_id: int,
    fecha_calibracion: date = Form(..., description="Fecha en que se realizó la calibración (obligatoria)"),
    observaciones: Optional[str] = Form(None, description="Observaciones opcionales"),
    certificado: Optional[UploadFile] = File(None, description="Certificado en formato PDF, JPG, PNG o WebP"),
    db: Session = Depends(get_db),
):
    return services.registrar_calibracion(
        db=db,
        equipo_id=equipo_id,
        fecha_calibracion=fecha_calibracion,
        observaciones=observaciones,
        archivo=certificado,
    )

@router.get(
    "/{equipo_id}/calibraciones",
    response_model=list[schemas.CalibracionEquipo],
    summary="Listar historial de calibraciones de un equipo",
)
def listar_historial_calibraciones_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
):
    return services.listar_historial_calibraciones(db, equipo_id)


@router.get(
    "/alertas/calibracion",
    response_model=list[schemas.AlertaCalibracion],
    summary="Listar alertas y estados de calibración de equipos",
)
def listar_alertas_calibracion_equipos(
    db: Session = Depends(get_db),
):
    return services.listar_alertas_calibracion(db)