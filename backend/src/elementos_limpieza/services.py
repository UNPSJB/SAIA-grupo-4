from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.elementos_limpieza.models import ElementoLimpieza
from src.elementos_limpieza import schemas, exceptions


# operaciones CRUD para ElementoLimpieza

def crear_elemento_limpieza(db: Session, elemento: schemas.ElementoLimpiezaCreate) -> schemas.ElementoLimpieza:
    # Verifica que no exista un elemento con el mismo nombre
    db_elemento_existente = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.nombre == elemento.nombre))
    if db_elemento_existente:
        if db_elemento_existente.activo:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(elemento_id=db_elemento_existente.id)

    # Crea el elemento y lo sube a la db
    db_elemento = ElementoLimpieza(**elemento.model_dump())
    db.add(db_elemento)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_elemento)
    return db_elemento


def leer_elemento_limpieza(db: Session, elemento_id: int) -> schemas.ElementoLimpieza:
    # Verificamos que el elemento exista en la base
    db_elemento = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
    if not db_elemento:
        raise exceptions.ElementoNoExiste()

    # Si existe el elemento lo retorna
    return db_elemento


def listar_elementos_limpieza(db: Session):
    return db.scalars(select(ElementoLimpieza)).all()


def modificar_elemento_limpieza(db: Session, elemento_id: int, elemento: schemas.ElementoLimpiezaUpdate) -> schemas.ElementoLimpiezaUpdate:
    db_elemento = leer_elemento_limpieza(db, elemento_id)
    update_data = elemento.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        # Verifica que no exista un elemento con el mismo nombre
        db_elemento_duplicado = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.nombre == elemento.nombre, ElementoLimpieza.id != elemento_id))
        if db_elemento_duplicado:
            raise exceptions.NombreDuplicado()

    if "activo" in update_data:
        if db_elemento.activo == elemento.activo:
            if elemento.activo:
                raise exceptions.ElementoActivo()
            else:
                raise exceptions.ElementoBaja()

    if update_data:
        # Modifica el elemento y lo sube a la db
        db.execute(update(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id).values(**update_data))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_elemento)
    return db_elemento


def eliminar_elemento_limpieza(db: Session, elemento_id: int) -> schemas.ElementoLimpiezaDelete:
    # Verificamos que el elemento exista
    elemento = schemas.ElementoLimpiezaUpdate(activo=False)
    db_elemento = modificar_elemento_limpieza(db, elemento_id, elemento)

    return db_elemento