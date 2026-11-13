from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from src.auth.dependencies import requiere_administracion
from src.configuracion import schemas, services
from src.database import get_db
from src.personal.models import Persona

router = APIRouter(prefix="/configuracion", tags=["configuracion"])

@router.get("/publica", response_model=schemas.ConfiguracionPublicaOut)
def obtener_configuracion_publica(db: Session = Depends(get_db)):
    return services.obtener_o_crear_configuracion(db)

@router.get("", response_model=schemas.ConfiguracionOut)
@router.get("/", response_model=schemas.ConfiguracionOut, include_in_schema=False)
def obtener_configuracion(
    db: Session = Depends(get_db),
    _admin: Persona = Depends(requiere_administracion),
):
    return services.obtener_o_crear_configuracion(db)

@router.put("", response_model=schemas.ConfiguracionOut)
@router.put("/", response_model=schemas.ConfiguracionOut, include_in_schema=False)
def actualizar_configuracion(
    datos: schemas.ConfiguracionUpdate,
    db: Session = Depends(get_db),
    admin: Persona = Depends(requiere_administracion),
):
    return services.actualizar_configuracion(db, datos, admin.id)

@router.post("/logo", response_model=schemas.ConfiguracionOut)
def subir_logo(
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: Persona = Depends(requiere_administracion),
):
    return services.subir_logo(db, logo, admin.id)

@router.delete("/logo", response_model=schemas.ConfiguracionOut)
def eliminar_logo(
    db: Session = Depends(get_db),
    admin: Persona = Depends(requiere_administracion),
):
    return services.eliminar_logo(db, admin.id)