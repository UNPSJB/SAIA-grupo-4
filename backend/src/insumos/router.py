import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.insumos import schemas, services
from src.auth.dependencies import requiere_administracion
from src.personal.models import Persona


logger = logging.getLogger(__name__)

# Router protegido: cualquier request sin sesión válida con capacidad
# 'administrar' responde 401 (sin token) o 403 (token de no-admin).
router = APIRouter(prefix="/insumos", tags=["insumos"], dependencies=[Depends(requiere_administracion)])


@router.post("/", response_model=schemas.Insumo, status_code=201)
def crear_insumo(
    insumo: schemas.InsumoCreate,
    db: Session = Depends(get_db),
    usuario_actual: Persona = Depends(requiere_administracion),
):
    return services.crear_insumo(db, insumo, usuario_id=usuario_actual.id)


@router.get("/{insumo_id}", response_model=schemas.Insumo)
def leer_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.leer_insumo(db, insumo_id)


@router.delete("/{insumo_id}", response_model=schemas.Insumo)
def eliminar_insumo(insumo_id: int, db: Session = Depends(get_db)):
    return services.eliminar_insumo(db, insumo_id)


@router.put("/{insumo_id}", response_model=schemas.Insumo)
def modificar_insumo(
    insumo_id: int,
    persona: schemas.InsumoUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Persona = Depends(requiere_administracion),
):
    return services.modificar_insumo(db, insumo_id, persona, usuario_id=usuario_actual.id)


@router.get("/", response_model=list[schemas.Insumo])
def listar_insumos(
    busqueda: str | None = None,
    disponible: bool | None = None,
    db: Session = Depends(get_db),
):
    return services.listar_insumos(db, busqueda, disponible)
