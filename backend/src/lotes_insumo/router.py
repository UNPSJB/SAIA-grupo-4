import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.lotes_insumo import schemas, services
from src.auth.dependencies import requiere_administracion, requiere_operacion
from typing import Literal
from src.lotes_insumo.constants import EstadoLote


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lotes-insumo", tags=["lotes-insumo"])

# Rutas para LoteInsumo

@router.post("/", response_model=schemas.LoteInsumo, status_code=201, dependencies=[Depends(requiere_administracion)])
def crear_lote_insumo(lote: schemas.LoteInsumoCreate, db: Session = Depends(get_db)):
    return services.crear_lote_insumo(db, lote)

@router.get("/", response_model=list[schemas.LoteInsumo], dependencies=[Depends(requiere_operacion)])
def listar_lotes_insumo(
    insumo_id: int | None = None,
    codigo_lote: str | None = None,
    estado: EstadoLote | None = None,
    orden: Literal["asc", "desc"] = "asc",
    db: Session = Depends(get_db),
):
    return services.listar_lotes_insumo(db, insumo_id, codigo_lote, estado, orden)

@router.get("/{lote_id}", response_model=schemas.LoteInsumo, dependencies=[Depends(requiere_operacion)])
def leer_lote_insumo(lote_id: int, db: Session = Depends(get_db)):
    return services.leer_lote_insumo(db, lote_id)

@router.put("/{lote_id}", response_model=schemas.LoteInsumo, dependencies=[Depends(requiere_administracion)])
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

@router.patch("/{lote_id}/dar-baja-vencido", response_model=schemas.LoteInsumo)
def dar_de_baja_lote_vencido(
    lote_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(requiere_administracion),
):
    return services.dar_de_baja_lote_vencido(db, lote_id, usuario.id)