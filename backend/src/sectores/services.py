from sqlalchemy.exc import IntegrityError
from typing import List

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.sectores.models import Sector
from src.sectores import schemas, exceptions
from src.equipos.models import Equipo


def crear_sector(db: Session, sector: schemas.SectorCreate) -> Sector:

    sector_existente = db.scalar(
        select(Sector).where(
            Sector.nombre == sector.nombre
        )
    )

    if sector_existente:
        if not sector_existente.activo:
            raise exceptions.SectorRequiereReactivacion(sector_existente.id)
        raise exceptions.SectorDuplicado()

    _sector = Sector(**sector.model_dump(), activo=True)

    db.add(_sector)
    try:
        db.commit()
        db.refresh(_sector)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el sector."
        )

    return _sector


def listar_sectores(db: Session) -> List[Sector]:
    return db.scalars(select(Sector)).all()

def leer_sector(db: Session, sector_id: int) -> Sector:
    db_sector = db.scalar(
        select(Sector).where(
            Sector.id == sector_id
        )
    )

    if db_sector is None:
        raise exceptions.SectorNoEncontrado()

    return db_sector


def modificar_sector(db: Session, sector_id: int, sector: schemas.SectorUpdate) -> Sector:
    db_sector = leer_sector(db, sector_id)

    update_data = sector.model_dump(exclude_unset=True)

    # 1. SECTOR INACTIVO:
    # Solo se permite reactivarlo.
    if not db_sector.activo:

        if update_data != {"activo": True}:
            raise exceptions.SectorInactivo()

    # 2. SECTOR ACTIVO:
    else:

        # La baja se realiza exclusivamente mediante DELETE.
        if update_data.get("activo") is False:
            raise exceptions.SectorBajaNoPermitida()

        # Comprobar nombre duplicado.
        if "nombre" in update_data:

            sector_existente = db.scalar(
                select(Sector).where(
                    Sector.nombre == update_data["nombre"],
                    Sector.id != sector_id
                )
            )

            if sector_existente:
                raise exceptions.SectorDuplicado()

    # 3. IMPACTAR CAMBIOS
    if update_data:
        db.execute(
            update(Sector)
            .where(Sector.id == sector_id)
            .values(**update_data)
        )

        try:
            db.commit()
            db.refresh(db_sector)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(
                detail="Error de integridad al intentar guardar el sector."
            )

    return db_sector


def eliminar_sector(db: Session, sector_id: int) -> Sector:

    db_sector = leer_sector(db, sector_id)

    # Solo los equipos activos impiden dar de baja el sector.
    equipo_activo = db.scalar(
        select(Equipo.id)
        .where(
            Equipo.sector_id == sector_id,
            Equipo.activo.is_(True)
        )
        .limit(1)
    )

    if equipo_activo is not None:
        raise exceptions.SectorTieneEquipos()

    db_sector.activo = False

    try:
        db.commit()
        db.refresh(db_sector)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el sector."
        )

    return db_sector