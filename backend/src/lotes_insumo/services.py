from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from src.insumos.models import Insumo
from src.insumos.exceptions import InsumoNoExiste
from src.lotes_insumo.models import LoteInsumo
from src.lotes_insumo import schemas, exceptions
from src.lotes_insumo.constants import EstadoLote, Constantes
from datetime import date, datetime


# operaciones CRUD para LoteInsumo

def _verificar_codigo_lote_unico(
    db: Session,
    insumo_id: int,
    codigo_lote: str,
    excluir_lote_id: int | None = None,
) -> None:
    consulta = select(LoteInsumo.id).where(
        LoteInsumo.insumo_id == insumo_id,
        func.lower(LoteInsumo.codigo_lote) == codigo_lote.strip().lower(),
    )
    if excluir_lote_id is not None:
        consulta = consulta.where(LoteInsumo.id != excluir_lote_id)
    if db.scalar(consulta) is not None:
        raise exceptions.CodigoLoteDuplicado()


def crear_lote_insumo(db: Session, lote: schemas.LoteInsumoCreate) -> schemas.LoteInsumo:
    # Verifica que el insumo exista y este disponible
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == lote.insumo_id))
    if db_insumo is None:
        raise InsumoNoExiste()
    if not db_insumo.disponible:
        raise exceptions.InsumoNoDisponible()
    if lote.fecha_vencimiento < date.today():
        raise exceptions.FechaVencimientoPasada()

    _verificar_codigo_lote_unico(db, lote.insumo_id, lote.codigo_lote)

    # Crea el lote (queda activo por defecto y con stock disponible igual al tamaño inicial)
    db_lote = LoteInsumo(**lote.model_dump(), cantidad_actual=lote.cantidad_inicial)
    db.add(db_lote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_lote)
    return db_lote


def leer_lote_insumo(db: Session, lote_id: int) -> schemas.LoteInsumo:
    # Verificamos que el lote exista en la base
    db_lote = db.scalar(select(LoteInsumo).where(LoteInsumo.id == lote_id))
    if not db_lote:
        raise exceptions.LoteNoExiste()

    return db_lote


def listar_lotes_insumo(
    db: Session,
    insumo_id: int | None = None,
    codigo_lote: str | None = None,
    estado: EstadoLote | None = None,
    orden: str = "asc",
):
    consulta = select(LoteInsumo)

    if insumo_id is not None:
        consulta = consulta.where(LoteInsumo.insumo_id == insumo_id)

    if codigo_lote and codigo_lote.strip():
        consulta = consulta.where(LoteInsumo.codigo_lote.ilike(f"%{codigo_lote.strip()}%"))

    if estado is not None:
        hoy = date.today()
        if estado == EstadoLote.INHABILITADO:
            consulta = consulta.where(LoteInsumo.activo.is_(False))
        elif estado == EstadoLote.AGOTADO:
            consulta = consulta.where(LoteInsumo.activo.is_(True), LoteInsumo.cantidad_actual <= 0)
        elif estado == EstadoLote.VENCIDO:
            consulta = consulta.where(
                LoteInsumo.activo.is_(True),
                LoteInsumo.cantidad_actual > 0,
                LoteInsumo.fecha_vencimiento < hoy,
            )
        else:
            consulta = consulta.where(
                LoteInsumo.activo.is_(True),
                LoteInsumo.cantidad_actual > 0,
                LoteInsumo.fecha_vencimiento >= hoy,
            )

    # Orden por fecha de vencimiento; el id desempata para que el resultado sea estable
    if orden == "desc":
        consulta = consulta.order_by(LoteInsumo.fecha_vencimiento.desc(), LoteInsumo.id.desc())
    else:
        consulta = consulta.order_by(LoteInsumo.fecha_vencimiento.asc(), LoteInsumo.id.asc())

    return db.scalars(consulta).all()


def modificar_lote_insumo(db: Session, lote_id: int, lote: schemas.LoteInsumoUpdate) -> schemas.LoteInsumo:
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()

    update_data = lote.model_dump(exclude_unset=True)

    if "fecha_vencimiento" in update_data and update_data["fecha_vencimiento"] < date.today():
        raise exceptions.FechaVencimientoPasada()

    if "codigo_lote" in update_data:
        _verificar_codigo_lote_unico(
            db, db_lote.insumo_id, update_data["codigo_lote"], excluir_lote_id=lote_id
        )

    if update_data:
        db.execute(update(LoteInsumo).where(LoteInsumo.id == lote_id).values(**update_data))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_lote)
    return db_lote


def eliminar_lote_insumo(db: Session, lote_id: int) -> schemas.LoteInsumo:
    # Baja logica: el lote no se borra, queda inactivo
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()

    db.execute(update(LoteInsumo).where(LoteInsumo.id == lote_id).values(activo=False))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()

    db.refresh(db_lote)
    return db_lote

def inhabilitar_lote_insumo(
    db: Session,
    lote_id: int,
    datos: schemas.LoteInsumoInhabilitar,
    usuario_id: int,
) -> schemas.LoteInsumo:
    # Baja lógica con auditoría: el lote no se borra, queda inhabilitado
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()

    db.execute(
        update(LoteInsumo)
        .where(LoteInsumo.id == lote_id)
        .values(
            activo=False,
            motivo_inhabilitacion=datos.motivo,
            fecha_inhabilitacion=datetime.now(),
            usuario_inhabilitacion_id=usuario_id,
        )
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()

    db.refresh(db_lote)
    return db_lote

def listar_alertas(db: Session) -> list[LoteInsumo]:
    """Lotes activos (vigentes y vencidos), del que vence antes al que vence después.

    Los inhabilitados quedan afuera: confirmada la baja, la alerta se resuelve sola.
    El estado (vencido / próximo / vigente) lo calcula el provider con la regla única
    de vencimientos.services.calcular_estado.
    """
    consulta = (
        select(LoteInsumo)
        .options(joinedload(LoteInsumo.insumo))  # evita una consulta por lote al armar el concepto
        .where(LoteInsumo.activo.is_(True), LoteInsumo.cantidad_actual > 0)
        .order_by(LoteInsumo.fecha_vencimiento.asc(), LoteInsumo.id.asc())
    )

    return db.scalars(consulta).all()


def listar_lotes_disponibles_para_consumo(db: Session, insumo_id: int) -> list[LoteInsumo]:
    """Lotes activos, no vencidos y con stock disponible, ordenados por FEFO."""
    hoy = date.today()
    consulta = (
        select(LoteInsumo)
        .where(
            LoteInsumo.insumo_id == insumo_id,
            LoteInsumo.activo.is_(True),
            LoteInsumo.cantidad_actual > 0,
            LoteInsumo.fecha_vencimiento >= hoy,
        )
        .order_by(LoteInsumo.fecha_vencimiento.asc(), LoteInsumo.id.asc())
    )
    return db.scalars(consulta).all()

def dar_de_baja_lote_vencido(db: Session, lote_id: int, usuario_id: int) -> schemas.LoteInsumo:
    # Confirmación de baja desde la alerta: solo aplica a lotes activos que ya vencieron.
    # El motivo lo fija el service para que no dependa de lo que mande el cliente.
    db_lote = leer_lote_insumo(db, lote_id)
    if not db_lote.activo:
        raise exceptions.LoteBaja()
    if db_lote.estado != EstadoLote.VENCIDO:
        raise exceptions.LoteNoVencido()

    datos = schemas.LoteInsumoInhabilitar(motivo=Constantes.MOTIVO_BAJA_VENCIDO)
    return inhabilitar_lote_insumo(db, lote_id, datos, usuario_id)