from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.elementos_limpieza.models import ElementoLimpieza
from src.elementos_limpieza import schemas, exceptions
from src.sectores.models import Sector
from src.sectores.exceptions import SectorNoEncontrado, SectorInactivo
from src.equipos.models import Equipo
from src.equipos.exceptions import EquipoNoEncontrado, EquipoInactivo
from src.tipo_elemento_limpieza.models import TipoElementoLimpieza


def _validar_tipo(db: Session, tipo_id: int) -> None:
    db_tipo = db.scalar(select(TipoElementoLimpieza).where(TipoElementoLimpieza.id == tipo_id))
    if db_tipo is None or not db_tipo.activo:
        raise exceptions.TipoInvalido()


def _validar_sector(db: Session, sector_id: int) -> None:
    db_sector = db.scalar(select(Sector).where(Sector.id == sector_id))
    if db_sector is None:
        raise SectorNoEncontrado()
    if not db_sector.activo:
        raise SectorInactivo()


def _validar_equipo(db: Session, equipo_id: int) -> None:
    db_equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
    if db_equipo is None:
        raise EquipoNoEncontrado()
    if not db_equipo.activo:
        raise EquipoInactivo()


def _validar_ubicacion_exclusiva(sector_id: int | None, equipo_id: int | None) -> None:
    if sector_id is not None and equipo_id is not None:
        raise exceptions.UbicacionExclusiva()


def crear_elemento_limpieza(db: Session, elemento: schemas.ElementoLimpiezaCreate) -> schemas.ElementoLimpieza:
    _validar_ubicacion_exclusiva(elemento.sector_id, elemento.equipo_id)

    db_tipo = db.scalar(select(TipoElementoLimpieza).where(TipoElementoLimpieza.id == elemento.tipo_id))
    if db_tipo is None or not db_tipo.activo:
        raise exceptions.TipoInvalido()

    if elemento.sector_id is not None:
        _validar_sector(db, elemento.sector_id)
    if elemento.equipo_id is not None:
        _validar_equipo(db, elemento.equipo_id)

    # Contamos cuántos elementos de este tipo existen (activos e inactivos)
    # para calcular el siguiente correlativo
    cantidad_existente = db.scalar(
        select(func.count()).select_from(ElementoLimpieza).where(ElementoLimpieza.tipo_id == elemento.tipo_id)
    )
    siguiente_correlativo = cantidad_existente + 1
    codigo_generado = f"{db_tipo.prefijo}-{siguiente_correlativo:04d}"

    db_elemento = ElementoLimpieza(**elemento.model_dump(), codigo=codigo_generado)
    db.add(db_elemento)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_elemento)
    return db_elemento


def leer_elemento_limpieza(db: Session, elemento_id: int) -> schemas.ElementoLimpieza:
    db_elemento = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
    if not db_elemento:
        raise exceptions.ElementoNoExiste()
    return db_elemento


def listar_elementos_limpieza(db: Session):
    return db.scalars(select(ElementoLimpieza)).all()


def modificar_elemento_limpieza(db: Session, elemento_id: int, elemento: schemas.ElementoLimpiezaUpdate) -> schemas.ElementoLimpiezaUpdate:
    db_elemento = leer_elemento_limpieza(db, elemento_id)
    update_data = elemento.model_dump(exclude_unset=True)

    if "tipo_id" in update_data and update_data["tipo_id"] is not None:
        _validar_tipo(db, update_data["tipo_id"])

    sector_id_final = update_data.get("sector_id", db_elemento.sector_id)
    equipo_id_final = update_data.get("equipo_id", db_elemento.equipo_id)
    _validar_ubicacion_exclusiva(sector_id_final, equipo_id_final)

    if "sector_id" in update_data and update_data["sector_id"] is not None:
        _validar_sector(db, update_data["sector_id"])

    if "equipo_id" in update_data and update_data["equipo_id"] is not None:
        _validar_equipo(db, update_data["equipo_id"])

    if "activo" in update_data:
        if db_elemento.activo == elemento.activo:
            if elemento.activo:
                raise exceptions.ElementoActivo()
            else:
                raise exceptions.ElementoBaja()

    if update_data:
        db.execute(update(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id).values(**update_data))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()
        db.refresh(db_elemento)
    return db_elemento


def eliminar_elemento_limpieza(db: Session, elemento_id: int) -> schemas.ElementoLimpiezaDelete:
    elemento = schemas.ElementoLimpiezaUpdate(activo=False)
    return modificar_elemento_limpieza(db, elemento_id, elemento)