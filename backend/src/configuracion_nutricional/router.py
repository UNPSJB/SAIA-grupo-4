from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_administracion
from src.configuracion_nutricional import schemas, services
from src.database import get_db
from src.personal.models import Persona
from src.rotulado import schemas as rotulado_schemas, services as rotulado_services

router = APIRouter(
    prefix="/configuracion-nutricional",
    tags=["Configuración Nutricional"],
)


@router.get(
    "/",
    response_model=list[schemas.ParametroNutricionalOut],
)
def listar_parametros_nutricionales(
    db: Session = Depends(get_db),
    _: Persona = Depends(requiere_administracion),
):
    """Lista los parámetros nutricionales normativos configurados."""
    return services.listar_parametros_nutricionales(db)


@router.put(
    "/",
    response_model=list[schemas.ParametroNutricionalOut],
)
def actualizar_parametros_nutricionales(
    payload: schemas.ConfiguracionNutricionalUpdateIn,
    db: Session = Depends(get_db),
    admin: Persona = Depends(requiere_administracion),
):
    """Actualiza los parámetros nutricionales normativos (VDR, decimales, umbrales y factor kJ)."""
    return services.actualizar_parametros_nutricionales(db, payload, usuario_id=admin.id)


@router.post(
    "/restaurar-defecto",
    response_model=list[schemas.ParametroNutricionalOut],
)
def restaurar_parametros_defecto(
    db: Session = Depends(get_db),
    admin: Persona = Depends(requiere_administracion),
):
    """Restaura los parámetros nutricionales a los valores CAA / Mercosur por defecto."""
    return services.restaurar_parametros_defecto(db, usuario_id=admin.id)


@router.get(
    "/rotulado-frontal",
    response_model=rotulado_schemas.NormativaRotuladoOut,
)
def obtener_normativa_rotulado_frontal(
    db: Session = Depends(get_db),
    _: Persona = Depends(requiere_administracion),
):
    """Obtiene la normativa activa y versionada de aplicabilidad de rotulado frontal (Ley 27.642)."""
    return rotulado_services.obtener_normativa_activa(db)


@router.put(
    "/rotulado-frontal",
    response_model=rotulado_schemas.NormativaRotuladoOut,
)
def actualizar_normativa_rotulado_frontal(
    payload: rotulado_schemas.NormativaRotuladoUpdateIn,
    db: Session = Depends(get_db),
    _: Persona = Depends(requiere_administracion),
):
    """Actualiza la versión y reglas configurables de aplicabilidad del rotulado frontal."""
    return rotulado_services.actualizar_normativa_activa(db, payload)


@router.post(
    "/rotulado-frontal/restaurar-defecto",
    response_model=rotulado_schemas.NormativaRotuladoOut,
)
def restaurar_normativa_rotulado_frontal(
    db: Session = Depends(get_db),
    _: Persona = Depends(requiere_administracion),
):
    """Restaura la normativa de rotulado frontal a los valores por defecto de la Ley 27.642."""
    return rotulado_services.restaurar_normativa_defecto(db)
