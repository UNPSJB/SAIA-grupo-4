import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.lotes_insumo import schemas, services
from src.auth.dependencies import requiere_administracion


logger = logging.getLogger(__name__)

# Router protegido: cualquier request sin sesión válida con capacidad
# 'administrar' responde 401 (sin token) o 403 (token de no-admin).
router = APIRouter(prefix="/lotes-insumo", tags=["lotes-insumo"], dependencies=[Depends(requiere_administracion)])

# Rutas para LoteInsumo

@router.post("/", response_model=schemas.LoteInsumo, status_code=201)
def crear_lote_insumo(lote: schemas.LoteInsumoCreate, db: Session = Depends(get_db)):
    return services.crear_lote_insumo(db, lote)

@router.get("/", response_model=list[schemas.LoteInsumo])
def listar_lotes_insumo(
    insumo_id: int | None = None,
    activo: bool | None = None,
    db: Session = Depends(get_db),
):
    return services.listar_lotes_insumo(db, insumo_id, activo)

@router.get("/{lote_id}", response_model=schemas.LoteInsumo)
def leer_lote_insumo(lote_id: int, db: Session = Depends(get_db)):
    return services.leer_lote_insumo(db, lote_id)

@router.put("/{lote_id}", response_model=schemas.LoteInsumo)
def modificar_lote_insumo(lote_id: int, lote: schemas.LoteInsumoUpdate, db: Session = Depends(get_db)):
    return services.modificar_lote_insumo(db, lote_id, lote)

@router.patch("/{lote_id}/inhabilitar", response_model=schemas.LoteInsumo)
def inhabilitar_lote_insumo(
    lote_id: int,
    datos: schemas.LoteInsumoInhabilitar,
    db: Session = Depends(get_db),
    usuario=Depends(requiere_administracion),
):
    return services.inhabilitar_lote_insumo(db, lote_id, datos, usuario.id)