from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.personal import exceptions as personal_exceptions
from src.personal.models import Persona
from src.recetas import exceptions, schemas
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta


def _validar_usuario_creador(db: Session, usuario_id: int) -> Persona:
    """Valida que la persona que crea/clona la receta exista y esté activa."""
    usuario = db.scalar(select(Persona).where(Persona.id == usuario_id))
    if not usuario:
        raise personal_exceptions.PersonaNoEncontrada()
    if not usuario.activo:
        raise personal_exceptions.PersonaInactiva()
    return usuario


def _generar_codigo_receta(db: Session) -> str:
    recetas = db.scalars(select(Receta.codigo_receta).order_by(Receta.id.desc())).all()
    ultimo_numero = 0
    for codigo in recetas:
        if codigo and codigo.startswith("REC-"):
            try:
                parte = codigo.split("-")[1]
                if parte.isdigit():
                    num = int(parte)
                    if num > ultimo_numero:
                        ultimo_numero = num
                    break
            except Exception:
                continue
    nuevo_numero = ultimo_numero + 1
    return f"REC-{nuevo_numero:03d}"


def _estado_actual(receta: Receta) -> str:
    return receta.estado.value if hasattr(receta.estado, "value") else receta.estado


def obtener_receta_por_id(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(
        select(Receta)
        .options(joinedload(Receta.usuario_creador))
        .where(Receta.id == receta_id)
    )
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return receta


def listar_recetas(db: Session) -> List[Receta]:
    return list(
        db.scalars(
            select(Receta)
            .options(joinedload(Receta.usuario_creador))
            .order_by(Receta.fecha_creacion.desc())
        ).all()
    )


def obtener_receta_borrador(db: Session) -> Optional[Receta]:
    return db.scalar(
        select(Receta)
        .options(joinedload(Receta.usuario_creador))
        .where(Receta.estado == EstadoReceta.BORRADOR)
        .order_by(Receta.fecha_creacion.desc())
    )


def obtener_recetas_activas(db: Session) -> List[Receta]:
    return list(
        db.scalars(
            select(Receta)
            .options(joinedload(Receta.usuario_creador))
            .where(Receta.estado == EstadoReceta.ACTIVA)
        ).all()
    )


def crear_receta_borrador(db: Session, receta: schemas.RecetaCreate, usuario_id: int) -> Receta:
    _validar_usuario_creador(db, usuario_id)

    codigo_receta = _generar_codigo_receta(db)

    nueva_receta = Receta(
        codigo_receta=codigo_receta,
        nombre_receta=receta.nombre_receta,
        producto_id=receta.producto_id,
        rendimiento_estandar=receta.rendimiento_estandar,
        tiempo_estimado_total=receta.tiempo_estimado_total,
        estado=EstadoReceta.BORRADOR,
        observaciones=receta.observaciones,
        fecha_creacion=datetime.now(),
        usuario_creador_id=usuario_id,
    )

    db.add(nueva_receta)
    try:
        db.commit()
        db.refresh(nueva_receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.CodigoRecetaDuplicado()

    return nueva_receta


def modificar_receta(db: Session, receta_id: int, receta_update: schemas.RecetaUpdate) -> Receta:
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual == EstadoReceta.INHABILITADA.value:
        raise exceptions.RecetaInhabilitadaNoEditable()
    if estado_actual == EstadoReceta.ACTIVA.value and receta.tiene_lotes:
        raise exceptions.RecetaConLotesNoEditable()

    update_data = receta_update.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(receta, key, value)

        try:
            db.commit()
            db.refresh(receta)
        except IntegrityError:
            db.rollback()
            raise exceptions.CodigoRecetaDuplicado()

    return receta


def activar_receta(db: Session, receta_id: int) -> Receta:
    """Pasa un borrador a estado ACTIVA, inhabilitando la receta activa anterior de ese producto (si existía)."""
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()

    # TODO: Descomentar cuando exista el CRUD de pasos en la Historia 2:
    # if not receta.pasos:
    #     raise exceptions.RecetaSinPasos()

    try:
        # Si ya había una receta ACTIVA para este mismo producto, pasa a INHABILITADA
        receta_vigente = db.scalar(
            select(Receta).where(
                Receta.producto_id == receta.producto_id,
                Receta.estado == EstadoReceta.ACTIVA,
            )
        )
        if receta_vigente:
            receta_vigente.estado = EstadoReceta.INHABILITADA

        receta.estado = EstadoReceta.ACTIVA
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return receta


def inhabilitar_receta(db: Session, receta_id: int) -> Receta:
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.ACTIVA.value:
        raise exceptions.RecetaNoActiva()

    receta.estado = EstadoReceta.INHABILITADA
    try:
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return receta


def pasar_a_borrador(db: Session, receta_id: int) -> Receta:
    """Pasa una receta ACTIVA a BORRADOR para permitir su edición si no tiene lotes asociados."""
    receta = obtener_receta_por_id(db, receta_id)

    if _estado_actual(receta) != EstadoReceta.ACTIVA.value:
        raise exceptions.RecetaNoActiva()
    if receta.tiene_lotes:
        raise exceptions.RecetaConLotesNoEditable()

    receta.estado = EstadoReceta.BORRADOR
    receta.fecha_creacion = datetime.now()  # Pasa a ser el borrador principal actual
    try:
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return receta


def retomar_borrador(db: Session, receta_id: int) -> Receta:
    """Actualiza la fecha de creación de un borrador viejo para convertirlo en el borrador principal de trabajo."""
    receta_borrador = obtener_receta_por_id(db, receta_id)

    if _estado_actual(receta_borrador) != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()

    borrador_principal = obtener_receta_borrador(db)
    if borrador_principal and borrador_principal.id == receta_id:
        return receta_borrador

    receta_borrador.fecha_creacion = datetime.now()

    try:
        db.commit()
        db.refresh(receta_borrador)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return receta_borrador


def clonar_receta(db: Session, receta_id: int, usuario_id: int) -> Receta:
    """Crea un nuevo borrador copiando la cabecera (y a futuro los pasos) de otra receta."""
    origen = obtener_receta_por_id(db, receta_id)
    _validar_usuario_creador(db, usuario_id)

    nueva_receta = Receta(
        codigo_receta=_generar_codigo_receta(db),
        nombre_receta=origen.nombre_receta,
        producto_id=origen.producto_id,
        rendimiento_estandar=origen.rendimiento_estandar,
        tiempo_estimado_total=origen.tiempo_estimado_total,
        estado=EstadoReceta.BORRADOR,
        observaciones=origen.observaciones,
        fecha_creacion=datetime.now(),
        usuario_creador_id=usuario_id,
        # TODO: Copiar los pasos cuando exista el modelo PasoReceta.
    )

    db.add(nueva_receta)
    try:
        db.commit()
        db.refresh(nueva_receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.CodigoRecetaDuplicado()

    return nueva_receta


def descartar_receta(db: Session, receta_id: int) -> None:
    """Elimina físicamente una receta en estado BORRADOR."""
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()

    try:
        db.delete(receta)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()