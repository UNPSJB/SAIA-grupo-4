from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions
from src.unidad_medida.models import UnidadMedida
from src.unidad_medida.exceptions import UnidadMedidaBaja


# operaciones CRUD para Insumo

def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> schemas.Insumo:
    # Verifica que no exista un insumo con el mismo nombre
    db_insumo_existente = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre))
    if db_insumo_existente:
        if db_insumo_existente.disponible:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(insumo_id=db_insumo_existente.id)

    # Verifica que la unidad de medida exista y este activa
    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == insumo.unidad_medida_id))
    if db_unidad is None or not db_unidad.disponible:
        raise UnidadMedidaBaja()

    # Crea el insumo y lo sube a la db
    db_insumo = Insumo(**insumo.model_dump())
    db.add(db_insumo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado() 
    db.refresh(db_insumo)
    return db_insumo


def leer_insumo(db: Session, insumo_id: int) -> schemas.Insumo:
    # Verificamos que el insumo exista en la base
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if not db_insumo:
        raise exceptions.InsumoNoExiste()

    # Si existe el insumo lo retorna
    return db_insumo


def listar_insumos(db: Session):
    return db.scalars(select(Insumo)).all()


def modificar_insumo(db: Session, insumo_id: int, insumo: schemas.InsumoUpdate) -> schemas.InsumoUpdate:
    db_insumo = leer_insumo(db, insumo_id)
    update_data = insumo.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        # Verifica que no exista un insumo con el mismo nombre
        db_insumo_duplicado = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre, Insumo.id != insumo_id))
        if db_insumo_duplicado:
            raise exceptions.NombreDuplicado()

    if "disponible" in update_data:
        if db_insumo.disponible == insumo.disponible:
            if insumo.disponible:
                raise exceptions.InsumoActivo()
            else:
                raise exceptions.InsumoBaja()

        if insumo.disponible:
            # Al dar de alta, la unidad de medida asociada debe existir y estar activa
            unidad_id = update_data.get("unidad_medida_id", db_insumo.unidad_medida_id)
            db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == unidad_id))
            if db_unidad is None or not db_unidad.disponible:
                raise UnidadMedidaBaja()

    if update_data:
        # Modifica el insumo y lo sube a la db
        db.execute(update(Insumo).where(Insumo.id == insumo_id).values(**update_data))        

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_insumo)
    return db_insumo


def eliminar_insumo(db: Session, insumo_id: int, ) -> schemas.InsumoDelete:
    # Verificamos que el insumo exista
    insumo = schemas.InsumoUpdate(disponible=False)
    db_insumo = modificar_insumo(db, insumo_id, insumo)

    return db_insumo