from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from typing import List

from src.exceptions import BadRequest

from src.insumo_quimico.models import InsumoQuimico
from src.insumo_quimico import schemas, exceptions

from src.unidad_medida.models import UnidadMedida
from src.unidad_medida.exceptions import UnidadMedidaReactivar, UnidadMedidaNoEncontrada

from src.equipos.models import Equipo
from src.equipos.exceptions import EquipoNoEncontrado, EquipoInactivo

from src.sectores.models import Sector
from src.sectores.exceptions import SectorNoEncontrado, SectorInactivo

def validar_asociacion(
    db: Session,
    equipo_id: int | None,
    sector_id: int | None,
):
    if equipo_id is not None and sector_id is not None:
        raise exceptions.InsumoQuimicoConSectorYEquipo()

    if equipo_id is not None:
        equipo = db.scalar(
            select(Equipo).where(Equipo.id == equipo_id)
        )

        if equipo is None:
            raise EquipoNoEncontrado()

        if not equipo.activo:
            raise EquipoInactivo()

    if sector_id is not None:
        sector = db.scalar(
            select(Sector).where(Sector.id == sector_id,)
        )

        if sector is None:
            raise SectorNoEncontrado()

        if not sector.activo:
            raise SectorInactivo()

def crear_insumo_quimico(db: Session, insumo_quimico: schemas.InsumoQuimicoCreate) -> schemas.InsumoQuimico:
    unidad_medida = db.scalar(
        select(UnidadMedida).where(
            UnidadMedida.id == insumo_quimico.unidad_medida_id
        )
    )

    if unidad_medida is None:
        raise UnidadMedidaNoEncontrada()

    if not unidad_medida.disponible:
        raise UnidadMedidaReactivar()

    insumo_quimico_existente = db.scalar(
        select(InsumoQuimico).where(
            InsumoQuimico.nombre == insumo_quimico.nombre,
            InsumoQuimico.tipo == insumo_quimico.tipo,
            InsumoQuimico.unidad_medida_id == insumo_quimico.unidad_medida_id,
        )
    )

    if insumo_quimico_existente:
        if not insumo_quimico_existente.activo:
            raise exceptions.InsumoQuimicoDuplicadoInactivo(
                insumo_quimico_existente.id
            )

        raise exceptions.InsumoQuimicoDuplicado()

    validar_asociacion(
        db,
        insumo_quimico.equipo_id,
        insumo_quimico.sector_id
    )

    _insumo_quimico = InsumoQuimico(**insumo_quimico.model_dump(), activo=True)

    db.add(_insumo_quimico)
    try:
        db.commit()
        db.refresh(_insumo_quimico)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el insumo químico."
        )

    return _insumo_quimico

def listar_insumos_quimicos(db: Session) -> List[InsumoQuimico]:
    return db.scalars(select(InsumoQuimico)).all()

def leer_insumo_quimico(db: Session, insumo_quimico_id: int) -> InsumoQuimico:
    db_insumo_quimico = db.scalar(
        select(InsumoQuimico).where(
            InsumoQuimico.id == insumo_quimico_id
        )
    )

    if db_insumo_quimico is None:
        raise exceptions.InsumoQuimicoNoExiste()

    return db_insumo_quimico


def modificar_insumo_quimico(db: Session, insumo_quimico_id: int, insumo_quimico: schemas.InsumoQuimicoUpdate) -> InsumoQuimico:
    db_insumo_quimico = leer_insumo_quimico(db, insumo_quimico_id)
    update_data = insumo_quimico.model_dump(exclude_unset=True)

    if not db_insumo_quimico.activo:

        if update_data != {"activo": True}:
            raise exceptions.InsumoQuimicoDuplicadoInactivo(db_insumo_quimico.id)

        if not db_insumo_quimico.unidad_medida.disponible:
            raise UnidadMedidaReactivar()

    else:
        
        if update_data.get("activo") is False:
            raise exceptions.InsumoQuimicoBajaNoPermitida()

        if any(
            campo in update_data
            for campo in (
                "nombre",
                "tipo",
                "unidad_medida_id"
            )
        ):
            nombre = update_data.get(
                "nombre",
                db_insumo_quimico.nombre
            )

            tipo = update_data.get(
                "tipo",
                db_insumo_quimico.tipo
            )

            unidad_medida_id = update_data.get(
                "unidad_medida_id",
                db_insumo_quimico.unidad_medida_id
            )

            equipo_id = update_data.get(
                "equipo_id",
                db_insumo_quimico.equipo_id,
            )
            
            sector_id = update_data.get(
                "sector_id",
                db_insumo_quimico.sector_id,
            )
            
            validar_asociacion(db, equipo_id, sector_id)

            insumo_quimico_existente = db.scalar(
                select(InsumoQuimico).where(
                    InsumoQuimico.nombre == nombre,
                    InsumoQuimico.tipo == tipo,
                    InsumoQuimico.unidad_medida_id == unidad_medida_id,
                    InsumoQuimico.id != insumo_quimico_id
                )
            )

            if insumo_quimico_existente:
                raise exceptions.InsumoQuimicoDuplicado()

        if "unidad_medida_id" in update_data:

            unidad_medida_nueva = db.scalar(
                select(UnidadMedida).where(
                    UnidadMedida.id == update_data["unidad_medida_id"]
                )
            )

            if unidad_medida_nueva is None:
                raise UnidadMedidaNoEncontrada()

            if not unidad_medida_nueva.disponible:
                raise UnidadMedidaInactiva()

    if update_data:
        db.execute(
            update(InsumoQuimico)
            .where(InsumoQuimico.id == insumo_quimico_id)
            .values(**update_data)
        )

        try:
            db.commit()
            db.refresh(db_insumo_quimico)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(
                detail="Error de integridad al intentar guardar el insumo químico."
            )

    return db_insumo_quimico

def eliminar_insumo_quimico(db: Session, insumo_quimico_id: int) -> InsumoQuimico:
    db_insumo_quimico = leer_insumo_quimico(db, insumo_quimico_id)
    db_insumo_quimico.activo = False
    try:
        db.commit()
        db.refresh(db_insumo_quimico)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el insumo químico."
        )

    return db_insumo_quimico