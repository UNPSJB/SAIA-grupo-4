from datetime import date, datetime, timedelta, time
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import select, func, cast, String, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.insumos.models import Insumo
from src.lotes import exceptions, schemas
from src.lotes.constants import EstadoLoteProduccion, LoteConstants
from src.lotes.models import ConsumoInsumoLote, DetalleConsumoLoteInsumo, Lote
from src.lotes_insumo.constants import EstadoLote
from src.lotes_insumo.models import LoteInsumo
from src.lotes_insumo.services import listar_lotes_disponibles_para_consumo
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta, PasoInsumo, PasoReceta
from src.recetas.services import _extraer_prefijo_producto
from src.unidad_medida.constants import Factores
from src.unidad_medida.models import UnidadMedida


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
                    um = pi.insumo.unidad_medida
                    tipo_mag = None
                    if um and um.tipo_magnitud is not None:
                        tipo_mag = um.tipo_magnitud.value if hasattr(um.tipo_magnitud, "value") else str(um.tipo_magnitud)
                    insumos_agrupados[ins_id] = {
                        "insumo_id": ins_id,
                        "nombre": pi.insumo.nombre,
                        "unidad_medida_simbolo": um.simbolo if um else "",
                        "unidad_medida_tipo": tipo_mag,
                        "cantidad_nominal_receta": 0.0,
                    }
                insumos_agrupados[ins_id]["cantidad_nominal_receta"] += float(pi.cantidad_consumo_estimada)

        insumos_teoricos = []
        for item in insumos_agrupados.values():
            lotes_disp = listar_lotes_disponibles_para_consumo(db, item["insumo_id"])
            insumos_teoricos.append(
                schemas.InsumoTeoricoRecetaOut(
                    **item,
                    lotes_disponibles=[
                        schemas.LoteInsumoDisponibleOut(
                            id=l.id,
                            insumo_id=l.insumo_id,
                            codigo_lote=l.codigo_lote,
                            fecha_vencimiento=l.fecha_vencimiento,
                            cantidad_inicial=float(l.cantidad_inicial),
                            cantidad_actual=float(l.cantidad_actual),
                        )
                        for l in lotes_disp
                    ],
                )
            )

        prod_um = prod.unidad_medida
        prod_tipo_mag = None
        if prod_um and prod_um.tipo_magnitud is not None:
            prod_tipo_mag = prod_um.tipo_magnitud.value if hasattr(prod_um.tipo_magnitud, "value") else str(prod_um.tipo_magnitud)

        resultado.append(
            schemas.ProductoDisponibleLoteOut(
                id=prod.id,
                nombre=prod.nombre,
                descripcion=prod.descripcion,
                unidad_medida_simbolo=prod_um.simbolo if prod_um else "",
                unidad_medida_tipo=prod_tipo_mag,
                dias_vida_util=prod.dias_vida_util,
                receta_id=receta_activa.id,
                receta_codigo=receta_activa.codigo_receta,
                receta_nombre=receta_activa.nombre_receta,
                receta_version=receta_activa.version,
                rendimiento_estandar=receta_activa.rendimiento_estandar,
                tamano_porcion=receta_activa.tamano_porcion,
                insumos_teoricos=insumos_teoricos,
            )
        )

    return resultado


def _validar_fechas_y_cantidad_lote(lote_in: schemas.LoteCreate) -> None:
    """Valida cantidad producida positiva y consistencia entre fechas de elaboración y vencimiento."""
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


def _obtener_producto_y_receta_activa(db: Session, producto_id: int) -> tuple[Producto, Receta]:
    """Obtiene el producto activo y su receta técnica activa con sus insumos precargados."""
    producto = db.scalar(
        select(Producto)
        .options(joinedload(Producto.unidad_medida))
        .where(Producto.id == producto_id)
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

    return producto, receta_activa


def _resolver_codigo_lote(db: Session, producto: Producto, lote_in: schemas.LoteCreate) -> str:
    """Genera un código automático o verifica que el código provisto no exista."""
    codigo = (lote_in.codigo_lote or "").strip()
    if not codigo:
        return generar_codigo_lote(db, producto, lote_in.fecha_elaboracion)

    existe = db.scalar(select(Lote.id).where(Lote.codigo_lote == codigo))
    if existe:
        raise exceptions.CodigoLoteDuplicado()
    return codigo


def _calcular_mapa_nominal_receta(receta_activa: Receta) -> dict[int, float]:
    """Agrupa las cantidades nominales de la receta por insumo disponible."""
    mapa_nominal: dict[int, float] = {}
    for paso in receta_activa.pasos:
        for pi in paso.insumos:
            if not pi.insumo or not pi.insumo.disponible:
                continue
            mapa_nominal[pi.insumo_id] = mapa_nominal.get(pi.insumo_id, 0.0) + float(
                pi.cantidad_consumo_estimada
            )
    return mapa_nominal


def _convertir_a_unidad_base_insumo(
    cantidad: float,
    unidad_origen: Optional[str],
    unidad_base: Optional[UnidadMedida],
) -> float:
    """Convierte una cantidad desde `unidad_origen` hacia la unidad base real del insumo."""
    if not unidad_origen or not unidad_origen.strip() or not unidad_base:
        return cantidad

    origen = unidad_origen.strip().lower()
    base_simbolo = (unidad_base.simbolo or "").strip().lower()
    base_nombre = (unidad_base.nombre or "").strip().lower()
    if origen in (base_simbolo, base_nombre):
        return cantidad

    tipo = getattr(unidad_base, "tipo_magnitud", "")
    magnitud = (tipo.value if hasattr(tipo, "value") else str(tipo or "")).strip().lower()

    if magnitud == "masa" or base_simbolo in Factores.MASA_A_GRAMOS:
        factor_origen = Factores.MASA_A_GRAMOS.get(origen)
        factor_base = Factores.MASA_A_GRAMOS.get(base_simbolo) or Factores.MASA_A_GRAMOS.get(base_nombre)
        if factor_origen is not None and factor_base is not None:
            return (cantidad * factor_origen) / factor_base
        raise exceptions.UnidadConsumoInvalida()

    if magnitud == "volumen" or base_simbolo in Factores.VOLUMEN_A_ML:
        factor_origen = Factores.VOLUMEN_A_ML.get(origen)
        factor_base = Factores.VOLUMEN_A_ML.get(base_simbolo) or Factores.VOLUMEN_A_ML.get(base_nombre)
        if factor_origen is not None and factor_base is not None:
            return (cantidad * factor_origen) / factor_base
        raise exceptions.UnidadConsumoInvalida()

    raise exceptions.UnidadConsumoInvalida()


def _descontar_lotes_insumo(
    db: Session,
    insumo_id: int,
    cant_real: float,
    lotes_asignados: list[schemas.DetalleLoteInsumoCreate],
    unidad_base: Optional[UnidadMedida] = None,
) -> list[DetalleConsumoLoteInsumo]:
    """Valida balance, vigencia y stock de los lotes físicos asignados y descuenta en la sesión."""
    if cant_real == 0:
        if lotes_asignados:
            raise exceptions.BalanceConsumoLoteInvalido()
        return []

    if not lotes_asignados:
        raise exceptions.LoteInsumoRequerido()

    lote_ids = [item.lote_insumo_id for item in lotes_asignados]
    if len(lote_ids) != len(set(lote_ids)):
        raise exceptions.LoteInsumoDuplicado()

    cantidades_base: list[Decimal] = []
    for item in lotes_asignados:
        conv = _convertir_a_unidad_base_insumo(
            float(item.cantidad),
            item.unidad,
            unidad_base,
        )
        cantidades_base.append(Decimal(str(round(conv, 3))))

    suma_lotes = sum(float(c) for c in cantidades_base)
    if abs(suma_lotes - cant_real) > 0.001:
        raise exceptions.BalanceConsumoLoteInvalido()

    detalles_orm: list[DetalleConsumoLoteInsumo] = []
    for item, cant_desc in zip(lotes_asignados, cantidades_base):
        if cant_desc <= 0:
            raise exceptions.BalanceConsumoLoteInvalido()
        lote_insumo = db.scalar(
            select(LoteInsumo).where(LoteInsumo.id == item.lote_insumo_id)
        )
        if not lote_insumo:
            raise exceptions.LoteInsumoNoEncontrado()
        if lote_insumo.insumo_id != insumo_id:
            raise exceptions.LoteInsumoNoPertenece()
        if lote_insumo.estado != EstadoLote.ACTIVO:
            raise exceptions.LoteInsumoInactivoOVencido()
        if cant_desc > lote_insumo.cantidad_actual:
            raise exceptions.StockLoteInsumoInsuficiente()

        lote_insumo.cantidad_actual = lote_insumo.cantidad_actual - cant_desc
        detalles_orm.append(
            DetalleConsumoLoteInsumo(
                lote_insumo_id=lote_insumo.id,
                cantidad=cant_desc,
            )
        )
    return detalles_orm


def _construir_consumos_lote(
    db: Session,
    receta_activa: Receta,
    lote_in: schemas.LoteCreate,
) -> list[ConsumoInsumoLote]:
    """Valida los consumos declarados contra la receta activa y construye el detalle ORM."""
    mapa_nominal = _calcular_mapa_nominal_receta(receta_activa)
    rendimiento = (
        float(receta_activa.rendimiento_estandar)
        if receta_activa.rendimiento_estandar > 0
        else 1.0
    )
    base_escala = (
        float(lote_in.masa_tanda_g)
        if lote_in.masa_tanda_g is not None
        else float(lote_in.cantidad_producida)
    )
    factor_escala = base_escala / rendimiento

    insumos_recibidos = lote_in.consumos or []
    ids_insumos = [item.insumo_id for item in insumos_recibidos]
    if len(ids_insumos) != len(set(ids_insumos)):
        raise exceptions.InsumoDuplicadoEnLote()

    if mapa_nominal and set(ids_insumos) != set(mapa_nominal.keys()):
        for c in insumos_recibidos:
            if c.insumo_id not in mapa_nominal:
                raise exceptions.InsumoNoPerteneceAReceta()
        raise exceptions.ConsumosIncompletos()

    consumos_orm: list[ConsumoInsumoLote] = []
    for c in insumos_recibidos:
        insumo_db = db.scalar(
            select(Insumo)
            .options(joinedload(Insumo.unidad_medida))
            .where(Insumo.id == c.insumo_id)
        )
        if not insumo_db:
            raise exceptions.InsumoNoEncontrado()
        if not insumo_db.disponible:
            raise exceptions.InsumoInactivo()
        if c.insumo_id not in mapa_nominal:
            raise exceptions.InsumoNoPerteneceAReceta()

        cant_real_convertida = _convertir_a_unidad_base_insumo(
            float(c.cantidad_real_utilizada),
            c.unidad,
            insumo_db.unidad_medida,
        )
        cant_real = round(cant_real_convertida, 3)
        detalles_orm = _descontar_lotes_insumo(
            db,
            c.insumo_id,
            cant_real,
            c.lotes,
            unidad_base=insumo_db.unidad_medida,
        )
        teorica = round(mapa_nominal[c.insumo_id] * factor_escala, 4)

        consumos_orm.append(
            ConsumoInsumoLote(
                insumo_id=c.insumo_id,
                cantidad_teorica=teorica,
                cantidad_real_utilizada=round(cant_real_convertida, 4),
                detalles_lotes=detalles_orm,
            )
        )
    return consumos_orm


def crear_lote(db: Session, lote_in: schemas.LoteCreate, operador_id: int) -> Lote:
    """Registra un nuevo lote de producción descontando atómicamente los lotes de insumo."""
    _validar_fechas_y_cantidad_lote(lote_in)
    producto, receta_activa = _obtener_producto_y_receta_activa(db, lote_in.producto_id)
    codigo = _resolver_codigo_lote(db, producto, lote_in)
    consumos_orm = _construir_consumos_lote(db, receta_activa, lote_in)

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
            joinedload(Lote.usuario_retencion),
            joinedload(Lote.consumos_insumos)
            .joinedload(ConsumoInsumoLote.insumo)
            .joinedload(Insumo.unidad_medida),
            joinedload(Lote.consumos_insumos)
            .joinedload(ConsumoInsumoLote.detalles_lotes)
            .joinedload(DetalleConsumoLoteInsumo.lote_insumo),
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
    codigo_lote_insumo: Optional[str] = None,
    estado: Optional[EstadoLoteProduccion] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    query = (
        select(Lote)
        .options(
            joinedload(Lote.producto).joinedload(Producto.unidad_medida),
            joinedload(Lote.receta),
            joinedload(Lote.operador),
            joinedload(Lote.usuario_retencion),
            joinedload(Lote.consumos_insumos)
            .joinedload(ConsumoInsumoLote.insumo)
            .joinedload(Insumo.unidad_medida),
            joinedload(Lote.consumos_insumos)
            .joinedload(ConsumoInsumoLote.detalles_lotes)
            .joinedload(DetalleConsumoLoteInsumo.lote_insumo),
        )
        .order_by(Lote.fecha_elaboracion.desc(), Lote.id.desc())
    )

    if producto_id is not None:
        query = query.where(Lote.producto_id == producto_id)

    if receta_id is not None:
        query = query.where(Lote.receta_id == receta_id)

    if operador_id is not None:
        query = query.where(Lote.operador_id == operador_id)

    if codigo_lote_insumo and codigo_lote_insumo.strip():
        codigo = codigo_lote_insumo.strip().lower()
        query = query.where(
            Lote.consumos_insumos.any(
                ConsumoInsumoLote.detalles_lotes.any(
                    DetalleConsumoLoteInsumo.lote_insumo.has(
                        func.lower(LoteInsumo.codigo_lote) == codigo
                    )
                )
            )
        )

    if desde is not None:
        query = query.where(Lote.fecha_elaboracion >= datetime.combine(desde, time.min))

    if hasta is not None:
        query = query.where(Lote.fecha_elaboracion <= datetime.combine(hasta, time.max))

    if estado is not None:
        hoy = date.today()
        if estado == EstadoLoteProduccion.RETENIDO:
            query = query.where(Lote.fecha_retencion.is_not(None))
        elif estado == EstadoLoteProduccion.VENCIDO:
            query = query.where(
                Lote.fecha_retencion.is_(None),
                Lote.fecha_vencimiento < hoy,
            )
        else:
            query = query.where(
                Lote.fecha_retencion.is_(None),
                Lote.fecha_vencimiento >= hoy,
            )

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
    codigo_lote_insumo: Optional[str] = None,
    estado: Optional[EstadoLoteProduccion] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[Lote]:
    """Lista todos los lotes de la planta para auditoría global de administradores."""
    query = _construir_query_lotes(
        busqueda=busqueda,
        producto_id=producto_id,
        receta_id=receta_id,
        operador_id=operador_id,
        codigo_lote_insumo=codigo_lote_insumo,
        estado=estado,
        desde=desde,
        hasta=hasta,
    )
    return list(db.scalars(query).unique().all())


def retener_lote(
    db: Session,
    lote_id: int,
    datos: schemas.LoteRetener,
    usuario_id: int,
) -> Lote:
    """Marca un lote de producción en estado RETENIDO con motivo, fecha y administrador."""
    db_lote = obtener_lote_por_id(db, lote_id)
    if db_lote.fecha_retencion is not None:
        raise exceptions.LoteYaRetenido()

    db_lote.motivo_retencion = datos.motivo
    db_lote.fecha_retencion = datetime.now()
    db_lote.usuario_retencion_id = usuario_id

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.LoteErrorIntegridad()

    return obtener_lote_por_id(db, lote_id)