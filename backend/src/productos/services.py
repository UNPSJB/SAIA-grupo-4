from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from typing import List

from src.productos.models import Producto
from src.productos import schemas, exceptions

from src.unidad_medida.models import UnidadMedida
from src.unidad_medida import exceptions as exc

def crear_producto(db: Session, producto: schemas.ProductoCreate) -> schemas.Producto:
    # Veo si hay un producto con el mismo nombre y unidad de medida
    db_producto_existente = db.scalar(select(Producto).where(
        Producto.nombre == producto.nombre,
        Producto.unidad_medida_id == producto.unidad_medida_id
    ))
    
    if db_producto_existente:
        if db_producto_existente.activo:
            # Lanzo la excepcion si esta duplicado y activo
            raise exceptions.ProductoDuplicado()
        # Lanzo la excepcion si esta duplicado pero inactivo
        raise exceptions.ProductoDuplicadoInactivo(producto_id = db_producto_existente.id)

    # Veo si la unidad de medida existe
    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == producto.unidad_medida_id))
    if db_unidad is None:
        # Lanzo la excepcion si la unidad de medida no existe
        raise exc.UnidadMedidaNoEncontrada

    if not db_unidad.disponible:
        # Lanzo la excepcion si la unidad de medida existe pero esta inactiva
        raise exc.UnidadMedidaReactivar

    db_producto = Producto(**producto.model_dump())
    db.add(db_producto)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ProductoErrorIntegridad()
    db.refresh(db_producto)
    return db_producto

def leer_producto(db: Session, producto_id: int) -> schemas.Producto:
    # Busco el producto a leer
    db_producto = db.scalar(select(Producto).where(Producto.id == producto_id))
    if not db_producto:
        # Si no existe lanzo la excepcion
        raise exceptions.ProductoNoEncontrado()

    return db_producto

def listar_productos(db: Session):
    # Lista todos los productos (sin filtro)
    return db.scalars(select(Producto)).all()

def modificar_producto(db: Session, producto_id: int, producto: schemas.ProductoUpdate) -> schemas.ProductoUpdate:
    # Busco el producto
    db_producto = leer_producto(db, producto_id)
    update_data = producto.model_dump(exclude_unset=True)

    # Vep si el producto esta inactivo
    if not db_producto.activo:
        if update_data != {"activo": True}:
            # Lanzo la excepcion si el producto esta duplicado pero inactivo
            raise exceptions.ProductoDuplicadoInactivo(db_producto.id)

        if not db_producto.unidad_medida.disponible:
            # Lanzo la excepcion si la unidad de medida esta inactiva
            raise exc.UnidadMedidaReactivar()

    else:
        if update_data.get("activo") is False:
            raise exceptions.ProductoInactivo()

        if any(
            campo in update_data
            for campo in (
                "nombre",
                "unidad_medida_id"
            )
        ):
            nombre = update_data.get(
                "nombre",
                db_producto.nombre
            )
            unidad_medida_id = update_data.get(
                "unidad_medida_id",
                db_producto.unidad_medida_id
            )

            producto_existente = db.scalar(
                select(Producto).where(
                    Producto.nombre == nombre,
                    Producto.unidad_medida_id == unidad_medida_id,
                    Producto.id != producto_id
                )
            )

            if producto_existente:
                raise exceptions.ProductoDuplicado()

        if "unidad_medida_id" in update_data:

            unidad_medida_nueva = db.scalar(
                select(UnidadMedida).where(
                    UnidadMedida.id == update_data["unidad_medida_id"]
                )
            )

            if unidad_medida_nueva is None:
                raise exc.UnidadMedidaNoEncontrada()

            if not unidad_medida_nueva.disponible:
                raise exc.UnidadMedidaBaja()

    if update_data:
        db.execute(
            update(Producto)
            .where(Producto.id == producto_id)
            .values(**update_data)
        )

        try:
            db.commit()
            db.refresh(db_producto)
        except IntegrityError:
            db.rollback()
            raise exceptions.ProductoErrorIntegridad()

    return db_producto

def eliminar_producto(db: Session, producto_id: int) -> Producto:
    db_producto = leer_producto(db, producto_id)
    db_producto.activo = False
    try:
        db.commit()
        db.refresh(db_producto)
    except IntegrityError:
        db.rollback()
        raise exceptions.ProductoErrorIntegridad()

    return db_producto