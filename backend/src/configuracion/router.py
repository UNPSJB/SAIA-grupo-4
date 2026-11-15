from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from src.auth.dependencies import requiere_administracion
from src.configuracion import schemas, services
from src.configuracion.schemas import ( 
    ConfiguracionModuloResponse,
    ConfiguracionPublicaResponse,
    ConfiguracionSistemaResponse,
    ConfiguracionSistemaUpdate,
    ModuloOctogonosUpdate,
    ParametrosFrontalesConsolidadoResponse,
    VersionParametroFrontalCreate,
)
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

@router.get(
    "/parametros-frontales",
    response_model=ParametrosFrontalesConsolidadoResponse,
    dependencies=[Depends(requiere_administracion)],
)
def obtener_parametros_frontales(db: Session = Depends(get_db)):
    return services.obtener_estado_parametros_frontales(db)


@router.post(
    "/parametros-frontales",
    response_model=ParametrosFrontalesConsolidadoResponse,
)
def crear_version_parametros_frontales(
    datos: VersionParametroFrontalCreate,
    db: Session = Depends(get_db),
    usuario: Persona = Depends(requiere_administracion),
):
    return services.crear_nueva_version_parametros(db, datos, usuario)


@router.patch(
    "/modulo-octogonos",
    response_model=ConfiguracionModuloResponse,
)
def actualizar_aplicabilidad_octogonos(
    datos: ModuloOctogonosUpdate,
    db: Session = Depends(get_db),
    usuario: Persona = Depends(requiere_administracion),
):
    return services.actualizar_modulo_octogonos(db, datos, usuario)