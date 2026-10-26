from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user, requiere_administracion
from src.database import get_db
from src.personal.models import Persona
from src.recetas import exceptions, schemas, services

router = APIRouter(prefix="/recetas", tags=["recetas"], dependencies=[Depends(requiere_administracion)])


@router.get("/", response_model=list[schemas.Receta])
def listar_recetas(db: Session = Depends(get_db)):
    """Lista todas las recetas (historial unificado)."""
    return services.listar_recetas(db)


@router.get("/activas", response_model=list[schemas.Receta])
def listar_recetas_activas(db: Session = Depends(get_db)):
    """Lista todas las recetas en estado ACTIVA."""
    return services.obtener_recetas_activas(db)


@router.get("/borrador", response_model=schemas.Receta)
def obtener_receta_borrador(db: Session = Depends(get_db)):
    """Devuelve la receta en estado BORRADOR más reciente (si existe)."""
    receta = services.obtener_receta_borrador(db)
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return receta


@router.get("/{receta_id}", response_model=schemas.Receta)
def obtener_receta(receta_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de una receta específica."""
    return services.obtener_receta_por_id(db, receta_id)


@router.post("/", response_model=schemas.Receta, status_code=status.HTTP_201_CREATED)
def crear_receta(
    receta: schemas.RecetaCreate,
    db: Session = Depends(get_db),
    current_user: Persona = Depends(get_current_user),
):
    """Crea una nueva receta en estado BORRADOR."""
    return services.crear_receta_borrador(db, receta, current_user.id)


@router.patch("/{receta_id}", response_model=schemas.Receta)
def modificar_receta(receta_id: int, receta: schemas.RecetaUpdate, db: Session = Depends(get_db)):
    """Modifica la cabecera de una receta (BORRADOR o ACTIVA sin lotes)."""
    return services.modificar_receta(db, receta_id, receta)


# --- ACCIONES DE ESTADO DE LA RECETA ---

@router.post("/{receta_id}/activar", response_model=schemas.Receta)
def activar_receta(receta_id: int, db: Session = Depends(get_db)):
    """Pasa una receta de BORRADOR a ACTIVA, inhabilitando la activa anterior del mismo producto."""
    return services.activar_receta(db, receta_id)


@router.post("/{receta_id}/inhabilitar", response_model=schemas.Receta)
def inhabilitar_receta(receta_id: int, db: Session = Depends(get_db)):
    """Pasa una receta de ACTIVA a INHABILITADA."""
    return services.inhabilitar_receta(db, receta_id)


@router.post("/{receta_id}/pasar-a-borrador", response_model=schemas.Receta)
def pasar_a_borrador(receta_id: int, db: Session = Depends(get_db)):
    """Pasa una receta ACTIVA a BORRADOR para editarla, si no tiene lotes."""
    return services.pasar_a_borrador(db, receta_id)


@router.post("/{receta_id}/retomar", response_model=schemas.Receta)
def retomar_borrador(receta_id: int, db: Session = Depends(get_db)):
    """Actualiza la fecha de un borrador viejo para convertirlo en el principal de trabajo."""
    return services.retomar_borrador(db, receta_id)


@router.post("/{receta_id}/clonar", response_model=schemas.Receta, status_code=status.HTTP_201_CREATED)
def clonar_receta(
    receta_id: int,
    db: Session = Depends(get_db),
    current_user: Persona = Depends(get_current_user),
):
    """Crea un nuevo borrador copiando la cabecera de otra receta."""
    return services.clonar_receta(db, receta_id, current_user.id)


@router.delete("/{receta_id}/descartar", status_code=status.HTTP_204_NO_CONTENT)
def descartar_receta(receta_id: int, db: Session = Depends(get_db)):
    """Elimina físicamente una receta en estado BORRADOR."""
    services.descartar_receta(db, receta_id)
    return None