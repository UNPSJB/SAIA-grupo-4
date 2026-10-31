from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.lotes.models import Lote, LoteInsumo
from src.lotes.schemas import LoteCreate, AsociarInsumosRequest, LoteInsumoOut, LoteOut
from src.productos.models import Producto
from src.insumos.models import Insumo

def mapear_lote_out(lote: Lote) -> LoteOut:
    """Convierte el modelo SQLAlchemy a LoteOut resolviendo nombre y unidad de insumo."""
    insumos_resp = []
    for li in lote.insumos_asociados:
        insumos_resp.append(
            LoteInsumoOut(
                id=li.id,
                insumo_id=li.insumo_id,
                cantidad=li.cantidad,
                nombre_insumo=li.insumo.nombre if li.insumo else "Insumo desconocido",
                unidad_medida=(
                    li.insumo.unidad_medida.simbolo
                    if li.insumo and li.insumo.unidad_medida
                    else ""
                ),
            )
        )
    return LoteOut(
        id=lote.id,
        producto_id=lote.producto_id,
        fecha=lote.fecha,
        cantidad=lote.cantidad,
        producto=lote.producto,
        insumos_asociados=insumos_resp,
    )

def crear_lote(db: Session, lote_in: LoteCreate):
    if lote_in.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad producida debe ser mayor a cero")
    
    producto = db.query(Producto).filter(Producto.id == lote_in.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="El producto seleccionado no existe")
    if not producto.activo:
        raise HTTPException(status_code=400, detail="El producto seleccionado está inactivo")

    nuevo_lote = Lote(**lote_in.model_dump())
    db.add(nuevo_lote)
    db.commit()
    db.refresh(nuevo_lote)
    return mapear_lote_out(nuevo_lote)

def listar_lotes(db: Session):
    lotes = db.query(Lote).order_by(Lote.fecha.desc()).all()
    return [mapear_lote_out(l) for l in lotes]

def obtener_lote_por_id(db: Session, lote_id: int) -> Lote:
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="El lote especificado no existe.")
    return lote

def asociar_insumos_a_lote(db: Session, lote_id: int, request: AsociarInsumosRequest):
    lote = obtener_lote_por_id(db, lote_id)

    insumos_ids = [item.insumo_id for item in request.insumos]
    if len(insumos_ids) != len(set(insumos_ids)):
        raise HTTPException(
            status_code=400,
            detail="No se puede repetir el mismo insumo en el lote."
        )

    for item in request.insumos:
        if item.cantidad <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"La cantidad para el insumo {item.insumo_id} debe ser mayor a cero."
            )

        insumo = db.query(Insumo).filter(Insumo.id == item.insumo_id).first()
        if not insumo:
            raise HTTPException(
                status_code=404,
                detail=f"El insumo con id {item.insumo_id} no existe."
            )
        if not insumo.disponible:
            raise HTTPException(
                status_code=400,
                detail=f"El insumo '{insumo.nombre}' está dado de baja y no se puede asociar."
            )

        nuevo_lote_insumo = LoteInsumo(
            lote_id=lote.id,
            insumo_id=insumo.id,
            cantidad=item.cantidad
        )
        db.add(nuevo_lote_insumo)

    db.commit()
    db.refresh(lote)
    return mapear_lote_out(lote)