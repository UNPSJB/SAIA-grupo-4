from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select, func, cast, String, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.insumos.models import Insumo
from src.lotes import exceptions, schemas
from src.lotes.constants import LoteConstants
from src.lotes.models import ConsumoInsumoLote, Lote
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta, PasoInsumo, PasoReceta
from src.recetas.services import _extraer_prefijo_producto


def generar_codigo_lote(db: Session, producto: Producto, fecha_elaboracion: datetime | date) -> str:
    """Genera el código de lote según regla LOT-{PREFIJO}-{YYYYMMDD}-{SEC}."""
    prefijo_prod = _extraer_prefijo_producto(producto.nombre)
    fecha_str = fecha_elaboracion.strftime("%Y%m%d")
    patron = f"{LoteConstants.PREFIJO_CODIGO}-{prefijo_prod}-{fecha_str}-"

    lotes_mismo_dia = db.scalars(
        select(Lote.codigo_lote).where(Lote.codigo_lote.like(f"{patron}%"))
    ).all()

    ultimo_numero = 0
    for codigo in lotes_mismo_dia:
        if codigo and codigo.startswith(patron):
            try:
                parte = codigo[len(patron):]
                if parte.isdigit():
                    num = int(parte)
                    if num > ultimo_numero:
                        ultimo_numero = num
            except Exception:
                continue

    nuevo_numero = ultimo_numero + 1
    return f"{patron}{nuevo_numero:0{LoteConstants.DIGITOS_SECUENCIA}d}"


def sugerir_codigo_lote(db: Session, producto_id: int, fecha: datetime | date) -> str:
    producto = db.scalar(select(Producto).where(Producto.id == producto_id))
    if not producto:
        raise exceptions.ProductoNoEncontrado()
    return generar_codigo_lote(db, producto, fecha)


def listar_productos_con_receta_activa(db: Session) -> List[schemas.ProductoDisponibleLoteOut]:
    """Lista todos los productos activos que poseen una receta en estado ACTIVA."""
    productos = db.scalars(
        select(Producto)
        .options(
            joinedload(Producto.unidad_medida),
            joinedload(Producto.recetas).joinedload(Receta.pasos).joinedload(PasoReceta.insumos).joinedload(PasoInsumo.insumo).joinedload(Insumo.unidad_medida),
        )
        .where(Producto.activo.is_(True))
        .order_by(Producto.nombre.asc())
    ).unique().all()

    resultado = []
    for prod in productos:
        receta_activa = next((r for r in prod.recetas if r.estado == EstadoReceta.ACTIVA), None)
        if not receta_activa:
            continue

        # Consolidar insumos de todos los pasos sumando la cantidad estimada nominal
        insumos_agrupados: dict[int, dict] = {}
        for paso in receta_activa.pasos:
            for pi in paso.insumos:
                if not pi.insumo or not pi.insumo.disponible:
                    continue
                ins_id = pi.insumo_id
                if ins_id not in insumos_agrupados:
                    insumos_agrupados[ins_id] = {
                        "insumo_id": ins_id,
                        "nombre": pi.insumo.nombre,
                        "unidad_medida_simbolo": pi.insumo.unidad_medida.simbolo if pi.insumo.unidad_medida else "",
                        "cantidad_nominal_receta": 0.0,
                    }
                insumos_agrupados[ins_id]["cantidad_nominal_receta"] += float(pi.cantidad_consumo_estimada)

        insumos_teoricos = [
            schemas.InsumoTeoricoRecetaOut(**item)
            for item in insumos_agrupados.values()
        ]

        resultado.append(
            schemas.ProductoDisponibleLoteOut(
                id=prod.id,
                nombre=prod.nombre,
                descripcion=prod.descripcion,
                unidad_medida_simbolo=prod.unidad_medida.simbolo if prod.unidad_medida else "",
                dias_vida_util=prod.dias_vida_util,
                receta_id=receta_activa.id,
                receta_codigo=receta_activa.codigo_receta,
                receta_nombre=receta_activa.nombre_receta,
                rendimiento_estandar=receta_activa.rendimiento_estandar,
                insumos_teoricos=insumos_teoricos,
            )
        )

    return resultado


def crear_lote(db: Session, lote_in: schemas.LoteCreate, operador_id: int) -> Lote:
    if lote_in.cantidad_producida <= 0:
        raise exceptions.CantidadProducidaInvalida()

    fecha_elab_date = (
        lote_in.fecha_elaboracion.date()
        if isinstance(lote_in.fecha_elaboracion, datetime)
        else lote_in.fecha_elaboracion
    )
    if fecha_elab_date > date.today():
        raise exceptions.FechaElaboracionFutura()

    if lote_in.fecha_vencimiento < fecha_elab_date:
        raise exceptions.FechaVencimientoInvalida()

    producto = db.scalar(
        select(Producto)
        .options(joinedload(Producto.unidad_medida))
        .where(Producto.id == lote_in.producto_id)
    )
    if not producto:
        raise exceptions.ProductoNoEncontrado()
    if not producto.activo:
        raise exceptions.ProductoInactivo()

    receta_activa = db.scalar(
        select(Receta)
        .options(
            joinedload(Receta.pasos)
            .joinedload(PasoReceta.insumos)
            .joinedload(PasoInsumo.insumo)
            .joinedload(Insumo.unidad_medida)
        )
        .where(
            Receta.producto_id == producto.id,
            Receta.estado == EstadoReceta.ACTIVA,
        )
    )
    if not receta_activa:
        raise exceptions.LoteSinRecetaActiva()

    # Validar o generar código de lote
    codigo = (lote_in.codigo_lote or "").strip()
    if not codigo:
        codigo = generar_codigo_lote(db, producto, lote_in.fecha_elaboracion)
    else:
        existe = db.scalar(select(Lote.id).where(Lote.codigo_lote == codigo))
        if existe:
            raise exceptions.CodigoLoteDuplicado()

    # Calcular mapa de insumos nominales de la receta
    mapa_nominal: dict[int, float] = {}
    for paso in receta_activa.pasos:
        for pi in paso.insumos:
            mapa_nominal[pi.insumo_id] = mapa_nominal.get(pi.insumo_id, 0.0) + float(pi.cantidad_consumo_estimada)

    rendimiento = float(receta_activa.rendimiento_estandar) if receta_activa.rendimiento_estandar > 0 else 1.0
    factor_escala = float(lote_in.cantidad_producida) / rendimiento

    # Procesar consumos
    consumos_orm = []
    insumos_recibidos = lote_in.consumos or []

    # Validar duplicados en payload
    ids_insumos = [item.insumo_id for item in insumos_recibidos]
    if len(ids_insumos) != len(set(ids_insumos)):
        raise exceptions.InsumoDuplicadoEnLote()

    if insumos_recibidos:
        for c in insumos_recibidos:
            insumo_db = db.scalar(select(Insumo).where(Insumo.id == c.insumo_id))
            if not insumo_db:
                raise exceptions.InsumoNoEncontrado()
            if not insumo_db.disponible:
                raise exceptions.InsumoInactivo()
            if c.insumo_id not in mapa_nominal:
                raise exceptions.InsumoNoPerteneceAReceta()

            teorica = round(mapa_nominal[c.insumo_id] * factor_escala, 4)
            consumos_orm.append(
                ConsumoInsumoLote(
                    insumo_id=c.insumo_id,
                    cantidad_teorica=teorica,
                    cantidad_real_utilizada=round(float(c.cantidad_real_utilizada), 4),
                )
            )
    else:
        # Si no se enviaron consumos, precargar automáticamente todos los insumos de la receta
        for ins_id, nominal in mapa_nominal.items():
            teorica = round(nominal * factor_escala, 4)
            consumos_orm.append(
                ConsumoInsumoLote(
                    insumo_id=ins_id,
                    cantidad_teorica=teorica,
                    cantidad_real_utilizada=teorica,
                )
            )

    nuevo_lote = Lote(
        codigo_lote=codigo,
        producto_id=producto.id,
        receta_id=receta_activa.id,
        operador_id=operador_id,
        fecha_elaboracion=lote_in.fecha_elaboracion,
        fecha_vencimiento=lote_in.fecha_vencimiento,
        fecha_registro_sistema=datetime.now(),
        cantidad_producida=lote_in.cantidad_producida,
        observaciones=lote_in.observaciones,
        consumos_insumos=consumos_orm,
    )

    db.add(nuevo_lote)

    # Actualizar consumo incremental en insumos utilizados
    for c_orm in consumos_orm:
        db.execute(
            update(Insumo)
            .where(Insumo.id == c_orm.insumo_id)
            .values(consumo=Insumo.consumo + Decimal(str(c_orm.cantidad_real_utilizada)))
        )

    try:
        db.commit()
        db.refresh(nuevo_lote)
    except IntegrityError:
        db.rollback()
        raise exceptions.LoteErrorIntegridad()

    return obtener_lote_por_id(db, nuevo_lote.id)


def obtener_lote_por_id(db: Session, lote_id: int) -> Lote:
    lote = db.scalar(
        select(Lote)
        .options(
            joinedload(Lote.producto).joinedload(Producto.unidad_medida),
            joinedload(Lote.receta),
            joinedload(Lote.operador),
            joinedload(Lote.consumos_insumos).joinedload(ConsumoInsumoLote.insumo).joinedload(Insumo.unidad_medida),
        )
        .where(Lote.id == lote_id)
    )
    if not lote:
        raise exceptions.LoteNoEncontrado()
    return lote


def _construir_query_lotes(
    busqueda: Optional[str] = None,
    producto_id: Optional[int] = None,
    receta_id: Optional[int] = None,
    operador_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    query = (
        select(Lote)
        .options(
            joinedload(Lote.producto).joinedload(Producto.unidad_medida),
            joinedload(Lote.receta),
            joinedload(Lote.operador),
            joinedload(Lote.consumos_insumos).joinedload(ConsumoInsumoLote.insumo).joinedload(Insumo.unidad_medida),
        )
        .order_by(Lote.fecha_elaboracion.desc(), Lote.id.desc())
    )

    if producto_id is not None:
        query = query.where(Lote.producto_id == producto_id)

    if receta_id is not None:
        query = query.where(Lote.receta_id == receta_id)

    if operador_id is not None:
        query = query.where(Lote.operador_id == operador_id)

    if desde is not None:
        query = query.where(func.date(Lote.fecha_elaboracion) >= desde)

    if hasta is not None:
        query = query.where(func.date(Lote.fecha_elaboracion) <= hasta)

    if busqueda:
        termino = f"%{busqueda.strip()}%"
        query = query.join(Lote.producto).join(Lote.receta).where(
            (Lote.codigo_lote.ilike(termino))
            | (Producto.nombre.ilike(termino))
            | (Receta.nombre_receta.ilike(termino))
            | (Receta.codigo_receta.ilike(termino))
            | (cast(Lote.cantidad_producida, String).ilike(termino))
        )

    return query


def listar_lotes_por_operador(
    db: Session,
    operador_id: int,
    busqueda: Optional[str] = None,
    producto_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[Lote]:
    """Lista únicamente los lotes cargados por el operador especificado (Mis Lotes)."""
    query = _construir_query_lotes(
        busqueda=busqueda,
        producto_id=producto_id,
        operador_id=operador_id,
        desde=desde,
        hasta=hasta,
    )
    return list(db.scalars(query).unique().all())


def listar_historial_lotes(
    db: Session,
    busqueda: Optional[str] = None,
    producto_id: Optional[int] = None,
    receta_id: Optional[int] = None,
    operador_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[Lote]:
    """Lista todos los lotes de la planta para auditoría global de administradores."""
    query = _construir_query_lotes(
        busqueda=busqueda,
        producto_id=producto_id,
        receta_id=receta_id,
        operador_id=operador_id,
        desde=desde,
        hasta=hasta,
    )
    return list(db.scalars(query).unique().all())
