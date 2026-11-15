from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_administracion
from src.configuracion_nutricional import schemas, services
from src.database import get_db
from src.personal.models import Persona

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
    _: Persona = Depends(requiere_administracion),
):
    """Actualiza los parámetros nutricionales normativos (VDR, decimales, umbrales y factor kJ)."""
    return services.actualizar_parametros_nutricionales(db, payload)


@router.post(
    "/restaurar-defecto",
    response_model=list[schemas.ParametroNutricionalOut],
)
def restaurar_parametros_defecto(
    db: Session = Depends(get_db),
    _: Persona = Depends(requiere_administracion),
):
    """Restaura los parámetros nutricionales a los valores CAA / Mercosur por defecto."""
    return services.restaurar_parametros_defecto(db)
