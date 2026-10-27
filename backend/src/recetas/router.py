from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user, requiere_administracion
from src.database import get_db
from src.personal.models import Persona
from src.recetas import exceptions, schemas, services

router = APIRouter(prefix="/recetas", tags=["recetas"], dependencies=[Depends(requiere_administracion)])

# RUTAS DE RECETA

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


# ACCIONES DE ESTADO DE LA RECETA

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


# RUTAS DE PASOS DE RECETA

@router.get("/{receta_id}/pasos", response_model=list[schemas.PasoRecetaOut])
def listar_pasos_de_receta(receta_id: int, db: Session = Depends(get_db)):
    """Lista todos los pasos cronológicos de una receta específica."""
    return services.listar_pasos_por_receta(db, receta_id)


@router.post("/{receta_id}/pasos", response_model=schemas.PasoRecetaOut, status_code=status.HTTP_201_CREATED)
def agregar_paso(receta_id: int, paso: schemas.PasoRecetaCreate, db: Session = Depends(get_db)):
    """Agrega un nuevo paso a una receta en estado borrador."""
    return services.agregar_paso_a_receta(db, receta_id, paso)


@router.get("/pasos/{paso_id}", response_model=schemas.PasoRecetaOut)
def obtener_paso(paso_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de un paso específico con sus insumos y equipos."""
    return services.obtener_paso_por_id(db, paso_id)


@router.patch("/pasos/{paso_id}", response_model=schemas.PasoRecetaOut)
def modificar_paso(paso_id: int, paso: schemas.PasoRecetaUpdate, db: Session = Depends(get_db)):
    """Modifica un paso existente. Reemplaza por completo sus listas de insumos y equipos."""
    return services.modificar_paso(db, paso_id, paso)


@router.delete("/pasos/{paso_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_paso(paso_id: int, db: Session = Depends(get_db)):
    """Elimina físicamente un paso de una receta en estado borrador."""
    services.eliminar_paso(db, paso_id)
    return None