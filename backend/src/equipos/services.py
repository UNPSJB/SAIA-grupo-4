from sqlalchemy.exc import IntegrityError
from typing import List

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.equipos.models import Equipo
from src.sectores.models import Sector
from src.equipos import schemas, exceptions
from src.sectores import exceptions as sector_exceptions


def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> Equipo:
    sector = db.scalar(
        select(Sector).where(
            Sector.id == equipo.sector_id
        )
    )

    if sector is None:
        raise sector_exceptions.SectorNoEncontrado()

    if not sector.activo:
        raise sector_exceptions.SectorInactivo()

    equipo_existente = db.scalar(
        select(Equipo).where(
            Equipo.nombre == equipo.nombre,
            Equipo.marca == equipo.marca,
            Equipo.numero_serie == equipo.numero_serie,
        )
    )

    if equipo_existente:
        if not equipo_existente.activo:
            raise exceptions.EquipoRequiereReactivacion(
                equipo_existente.id
            )

        raise exceptions.EquipoDuplicado()

    _equipo = Equipo(**equipo.model_dump(), activo=True)

    db.add(_equipo)
    try:
        db.commit()
        db.refresh(_equipo)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el equipo."
        )

    return _equipo


def listar_equipos(db: Session) -> List[Equipo]:
    return db.scalars(select(Equipo)).all()


def leer_equipo(db: Session, equipo_id: int) -> Equipo:
    db_equipo = db.scalar(
        select(Equipo).where(
            Equipo.id == equipo_id
        )
    )

    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()

    return db_equipo


def modificar_equipo(db: Session, equipo_id: int, equipo: schemas.EquipoUpdate) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    update_data = equipo.model_dump(exclude_unset=True)

    # 1. EQUIPO INACTIVO:
    # Solo se permite reactivarlo.
    if not db_equipo.activo:

        if update_data != {"activo": True}:
            raise exceptions.EquipoInactivo()

        # El sector actual también debe estar activo.
        if not db_equipo.sector.activo:
            raise sector_exceptions.SectorInactivo()

    # 2. EQUIPO ACTIVO:
    else:

        # La baja se realiza exclusivamente mediante DELETE.
        if update_data.get("activo") is False:
            raise exceptions.EquipoBajaNoPermitida()

        # Comprobar duplicados si cambian nombre, marca o número de serie.
        if any(
            campo in update_data
            for campo in (
                "nombre",
                "marca",
                "numero_serie"
            )
        ):
            nombre = update_data.get(
                "nombre",
                db_equipo.nombre
            )

            marca = update_data.get(
                "marca",
                db_equipo.marca
            )

            numero_serie = update_data.get(
                "numero_serie",
                db_equipo.numero_serie
            )

            equipo_existente = db.scalar(
                select(Equipo).where(
                    Equipo.nombre == nombre,
                    Equipo.marca == marca,
                    Equipo.numero_serie == numero_serie,
                    Equipo.id != equipo_id
                )
            )

            if equipo_existente:
                raise exceptions.EquipoDuplicado()

        # Comprobar que el nuevo sector exista y esté activo.
        if "sector_id" in update_data:

            sector_nuevo = db.scalar(
                select(Sector).where(
                    Sector.id == update_data["sector_id"]
                )
            )

            if sector_nuevo is None:
                raise sector_exceptions.SectorNoEncontrado()

            if not sector_nuevo.activo:
                raise sector_exceptions.SectorInactivo()

    # 3. IMPACTAR CAMBIOS
    if update_data:
        db.execute(
            update(Equipo)
            .where(Equipo.id == equipo_id)
            .values(**update_data)
        )

        try:
            db.commit()
            db.refresh(db_equipo)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(
                detail="Error de integridad al intentar guardar el equipo."
            )

    return db_equipo


def eliminar_equipo(db: Session, equipo_id: int) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    db_equipo.activo = False
    try:
        db.commit()
        db.refresh(db_equipo)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el equipo."
        )

    return db_equipo