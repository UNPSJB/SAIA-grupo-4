from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.unidad_medida.models import UnidadMedida
from src.insumos.models import Insumo
from src.unidad_medida import schemas, exceptions, constants


# operaciones CRUD para Unidad Medida

def crear_unidad_medida(db: Session, unidad: schemas.UnidadMedidaCreate) -> schemas.UnidadMedida:
    # Verifica que no exista una unidad de medida con el mismo nombre
    db_unidad_existente = db.scalar(select(UnidadMedida).where(UnidadMedida.nombre == unidad.nombre))
    if db_unidad_existente:
        if db_unidad_existente.disponible:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(unidad_medida_id=db_unidad_existente.id)

    # Crea la unidad de medida y la sube a la db
    db_unidad = UnidadMedida(**unidad.model_dump())
    db.add(db_unidad)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_unidad)
    return db_unidad


def leer_unidad_medida(db: Session, unidad_medida_id: int) -> schemas.UnidadMedida:
    # Verificamos que la unidad de medida exista en la base
    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == unidad_medida_id))
    if not db_unidad:
        raise exceptions.UnidadMedidaNoEncontrada()

    # Si existe la unidad de medida la retorna
    return db_unidad


def listar_unidades_de_medida(db: Session):
    return db.scalars(select(UnidadMedida)).all()


def modificar_unidad_medida(db: Session, unidad_medida_id: int, unidad: schemas.UnidadMedidaUpdate) -> schemas.UnidadMedida:
    db_unidad = leer_unidad_medida(db, unidad_medida_id)
    update_data = unidad.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        # Verifica que no exista una unidad de medida con el mismo nombre
        db_unidad_duplicado = db.scalar(select(UnidadMedida).where(UnidadMedida.nombre == unidad.nombre, UnidadMedida.id != unidad_medida_id))
        if db_unidad_duplicado:
            raise exceptions.NombreDuplicado()

    if "disponible" in update_data:
        if db_unidad.disponible == unidad.disponible:
            if unidad.disponible:
                raise exceptions.UnidadMedidaActiva()
            else:
                raise exceptions.UnidadMedidaBaja()

    if update_data:
        # Modifica la unidad de medida y la sube a la db
        db.execute(update(UnidadMedida).where(UnidadMedida.id == unidad_medida_id).values(**update_data))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_unidad)
    return db_unidad


def eliminar_unidad_medida(db: Session, unidad_medida_id: int) -> schemas.UnidadMedida:
    # Verificamos que la unidad de medida exista
    db_unidad = leer_unidad_medida(db, unidad_medida_id)

    # No se puede eliminar una unidad de medida si hay insumos activos asociados
    insumo_asociado = db.scalar(
        select(Insumo.id).where(Insumo.unidad_medida_id == unidad_medida_id, Insumo.disponible == True)
    )
    if insumo_asociado is not None:
        raise exceptions.UnidadMedidaEnUso()

    # Baja logica de la unidad de medida
    unidad = schemas.UnidadMedidaUpdate(disponible=False)
    db_unidad = modificar_unidad_medida(db, unidad_medida_id, unidad)

    return db_unidad


def convertir_a_gramos(
    cantidad: float,
    unidad: UnidadMedida,
    densidad_g_ml: Optional[float] = None,
    peso_unitario_g: Optional[float] = None,
) -> Optional[float]:
    """Convierte una cantidad en cualquier unidad de medida a su equivalente en gramos.

    Retorna None si falta una equivalencia necesaria (densidad para volumen,
    peso unitario para cantidad, o factor de conversión desconocido).
    """
    if cantidad is None:
        return None
    cant = float(cantidad)
    if cant <= 0:
        return 0.0

    tipo = getattr(unidad, "tipo_magnitud", "")
    magnitud = (tipo.value if hasattr(tipo, "value") else str(tipo or "")).strip().lower()
    simbolo = (getattr(unidad, "simbolo", "") or "").strip().lower()
    nombre = (getattr(unidad, "nombre", "") or "").strip().lower()

    if magnitud == "masa":
        factor = constants.Factores.MASA_A_GRAMOS.get(simbolo) or constants.Factores.MASA_A_GRAMOS.get(nombre)
        if factor is None:
            return None
        return cant * factor

    if magnitud == "volumen":
        if densidad_g_ml is None or float(densidad_g_ml) <= 0:
            return None
        factor_ml = constants.Factores.VOLUMEN_A_ML.get(simbolo) or constants.Factores.VOLUMEN_A_ML.get(nombre)
        if factor_ml is None:
            return None
        return cant * factor_ml * float(densidad_g_ml)

    if magnitud == "cantidad":
        if peso_unitario_g is None or float(peso_unitario_g) <= 0:
            return None
        factor_u = constants.Factores.CANTIDAD_A_UNIDAD.get(simbolo) or constants.Factores.CANTIDAD_A_UNIDAD.get(nombre)
        if factor_u is None:
            return None
        return cant * factor_u * float(peso_unitario_g)

    return None
