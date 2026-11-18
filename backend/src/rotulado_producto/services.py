from datetime import datetime
from typing import Optional
import unicodedata
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.configuracion.services import obtener_o_crear_configuracion
from src.lotes.models import Lote
from src.productos.models import Producto
from src.recetas import services as recetas_services
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta
from src.rotulado import services as rotulado_services
from src.rotulado_producto import exceptions, schemas
from src.rotulado_producto.models import RotuloProducto


def _normalizar_texto(valor: Optional[str]) -> Optional[str]:
    if valor is None:
        return None
    limpio = valor.strip()
    return limpio if limpio else None


def _clave_comparacion(valor: Optional[str]) -> str:
    limpio = _normalizar_texto(valor) or ""
    limpio = limpio.replace("—", "-").replace("–", "-")
    return unicodedata.normalize("NFKD", limpio).encode("ascii", "ignore").decode("ascii")


def _obtener_producto(db: Session, producto_id: int) -> Producto:
    producto = db.scalar(
        select(Producto)
        .options(joinedload(Producto.unidad_medida))
        .where(Producto.id == producto_id)
    )
    if not producto:
        raise exceptions.ProductoNoEncontrado()
    return producto


def _formatear_porcion(tamano_porcion_g: Optional[float], es_liquido: bool) -> Optional[str]:
    if tamano_porcion_g is None or tamano_porcion_g <= 0:
        return None
    unidad = "ml" if es_liquido else "g"
    numero = f"{tamano_porcion_g:g}"
    return f"{numero} {unidad}"


def _construir_tabla_nutricional_rotulo(
    db: Session,
    receta_id: int,
    es_liquido: bool,
) -> tuple[list[schemas.FilaNutricionalRotuloItem], Optional[str], Optional[str]]:
    info_nutri = recetas_services.obtener_informacion_nutricional(db, receta_id)
    porcion_str = _formatear_porcion(info_nutri.tamano_porcion_g, es_liquido)
    if not info_nutri.es_calculable:
        return [], porcion_str, info_nutri.leyenda_vd

    filas: list[schemas.FilaNutricionalRotuloItem] = []
    for fila in info_nutri.filas:
        vd_str = (
            f"{fila.porcentaje_vd}%"
            if fila.lleva_vd and fila.porcentaje_vd is not None
            else "—"
        )
        filas.append(
            schemas.FilaNutricionalRotuloItem(
                codigo_nutriente=fila.codigo_nutriente,
                nombre_etiqueta=fila.nombre_etiqueta,
                unidad=fila.unidad,
                nivel_indentacion=fila.nivel_indentacion,
                valor_100g=fila.valor_100g_formateado or "—",
                valor_porcion=(
                    fila.valor_porcion_formateado or "—"
                    if info_nutri.tiene_porcion
                    else "—"
                ),
                porcentaje_vd=vd_str,
                lleva_vd=fila.lleva_vd,
            )
        )
    return filas, porcion_str, info_nutri.leyenda_vd


def _calcular_datos_autocompletados(
    db: Session,
    producto: Producto,
) -> schemas.DatosAutocompletadosRecetaOut:
    """Precarga datos desde la receta ACTIVA (sin fallback a borradores), lotes y establecimiento."""
    receta_activa = db.scalar(
        select(Receta)
        .where(
            Receta.producto_id == producto.id,
            Receta.estado == EstadoReceta.ACTIVA,
        )
        .order_by(Receta.id.desc())
    )

    lista_ingredientes: Optional[str] = None
    tamano_porcion: Optional[str] = None
    leyenda_vd: Optional[str] = None
    tabla_nutricional: list[schemas.FilaNutricionalRotuloItem] = []
    sellos_calc: list[schemas.SelloRotuloItem] = []
    leyendas_calc: list[schemas.SelloRotuloItem] = []
    dictamen_str: Optional[str] = None

    if receta_activa is not None:
        declaracion = recetas_services.obtener_declaracion_ingredientes(db, receta_activa.id)
        lista_ingredientes = _normalizar_texto(declaracion.texto_legal_rotulo)

        tabla_nutricional, tamano_porcion, leyenda_vd = _construir_tabla_nutricional_rotulo(
            db, receta_activa.id, producto.es_liquido
        )

        sellos_out = rotulado_services.calcular_sellos_advertencia(db, receta_activa.id)
        dictamen_str = sellos_out.dictamen_aplicabilidad.value
        sellos_calc = [
            schemas.SelloRotuloItem(codigo=s.codigo, texto=s.texto)
            for s in sellos_out.sellos
        ]
        leyendas_calc = [
            schemas.SelloRotuloItem(codigo=l.codigo, texto=l.texto)
            for l in sellos_out.leyendas_precautorias
        ]

    lotes_db = db.scalars(
        select(Lote)
        .options(joinedload(Lote.receta))
        .where(Lote.producto_id == producto.id)
        .order_by(Lote.fecha_elaboracion.desc(), Lote.id.desc())
    ).all()

    lotes_disponibles = [
        schemas.LoteResumenRotuloOut(
            id=lote.id,
            codigo_lote=lote.codigo_lote,
            fecha_elaboracion=lote.fecha_elaboracion,
            fecha_vencimiento=lote.fecha_vencimiento,
            receta_codigo=lote.receta_codigo,
        )
        for lote in lotes_db
    ]
    ultimo_lote = lotes_disponibles[0] if lotes_disponibles else None

    config = obtener_o_crear_configuracion(db)
    razon_social = _normalizar_texto(config.razon_social) or _normalizar_texto(
        config.nombre_establecimiento
    )
    partes_domicilio = [
        p
        for p in (
            _normalizar_texto(config.direccion),
            _normalizar_texto(config.localidad),
            _normalizar_texto(config.provincia),
        )
        if p
    ]
    domicilio = ", ".join(partes_domicilio) if partes_domicilio else None

    return schemas.DatosAutocompletadosRecetaOut(
        tiene_receta_activa=receta_activa is not None,
        receta_id=receta_activa.id if receta_activa else None,
        receta_codigo=receta_activa.codigo_receta if receta_activa else None,
        receta_nombre=receta_activa.nombre_receta if receta_activa else None,
        lista_ingredientes_calculada=lista_ingredientes,
        tamano_porcion_calculado=tamano_porcion,
        leyenda_vd_calculada=leyenda_vd,
        tabla_nutricional_calculada=tabla_nutricional,
        sellos_calculados=sellos_calc,
        leyendas_calculadas=leyendas_calc,
        dictamen_aplicabilidad=dictamen_str,
        ultimo_lote=ultimo_lote,
        lotes_disponibles=lotes_disponibles,
        razon_social_establecimiento=razon_social,
        domicilio_establecimiento=domicilio,
    )


def _serializar_tabla(items: list[schemas.FilaNutricionalRotuloItem]) -> list[dict]:
    return [
        {
            "codigo_nutriente": it.codigo_nutriente,
            "nombre_etiqueta": _clave_comparacion(it.nombre_etiqueta),
            "unidad": it.unidad,
            "nivel_indentacion": it.nivel_indentacion,
            "valor_100g": _clave_comparacion(it.valor_100g),
            "valor_porcion": _clave_comparacion(it.valor_porcion),
            "porcentaje_vd": _clave_comparacion(it.porcentaje_vd),
            "lleva_vd": it.lleva_vd,
        }
        for it in items
    ]


def _serializar_sellos(items: list[schemas.SelloRotuloItem]) -> list[tuple[str, str]]:
    return sorted((it.codigo.strip(), _clave_comparacion(it.texto)) for it in items)


def _difiere_ingredientes(
    texto_actual: Optional[str],
    auto: schemas.DatosAutocompletadosRecetaOut,
) -> bool:
    actual = _clave_comparacion(texto_actual)
    if not auto.tiene_receta_activa:
        return actual != ""
    return actual != _clave_comparacion(auto.lista_ingredientes_calculada)


def _difiere_nutricion(
    tabla_actual: list[schemas.FilaNutricionalRotuloItem],
    porcion_actual: Optional[str],
    leyenda_actual: Optional[str],
    auto: schemas.DatosAutocompletadosRecetaOut,
) -> bool:
    if not auto.tiene_receta_activa:
        return bool(tabla_actual or _normalizar_texto(porcion_actual))
    return (
        _serializar_tabla(tabla_actual) != _serializar_tabla(auto.tabla_nutricional_calculada)
        or _clave_comparacion(porcion_actual) != _clave_comparacion(auto.tamano_porcion_calculado)
        or _clave_comparacion(leyenda_actual) != _clave_comparacion(auto.leyenda_vd_calculada)
    )


def _difiere_sellos(
    sellos_actuales: list[schemas.SelloRotuloItem],
    leyendas_actuales: list[schemas.SelloRotuloItem],
    auto: schemas.DatosAutocompletadosRecetaOut,
) -> bool:
    if not auto.tiene_receta_activa:
        return bool(sellos_actuales or leyendas_actuales)
    return (
        _serializar_sellos(sellos_actuales) != _serializar_sellos(auto.sellos_calculados)
        or _serializar_sellos(leyendas_actuales) != _serializar_sellos(auto.leyendas_calculadas)
    )


def _difiere_lote(
    codigo_lote: Optional[str],
    fecha_duracion: Optional[str],
    lote_ref: Optional[schemas.LoteResumenRotuloOut],
) -> bool:
    if lote_ref is None:
        return False
    venc_ref = lote_ref.fecha_vencimiento.strftime("%d/%m/%Y")
    return (
        _normalizar_texto(codigo_lote) != _normalizar_texto(lote_ref.codigo_lote)
        or _normalizar_texto(fecha_duracion) != venc_ref
    )


def verificar_completitud_caa(
    *,
    denominacion_venta: Optional[str],
    contenido_neto: Optional[str],
    aplica_peso_escurrido: bool,
    peso_escurrido: Optional[str],
    razon_social_elaborador: Optional[str],
    domicilio_elaborador: Optional[str],
    pais_origen: Optional[str],
    rne_elaborador: Optional[str],
    rnpa_rppa: Optional[str],
    es_importado: bool,
    nombre_importador: Optional[str],
    domicilio_importador: Optional[str],
    rne_importador: Optional[str],
    codigo_lote_declarado: Optional[str],
    fecha_duracion_minima: Optional[str],
    condiciones_conservacion: Optional[str],
    aplica_instrucciones_uso: bool,
    instrucciones_uso: Optional[str],
    lista_ingredientes_texto: Optional[str],
    tamano_porcion_declarado: Optional[str],
    tabla_nutricional_json: list[schemas.FilaNutricionalRotuloItem],
) -> schemas.CompletitudCAAOut:
    """Evalúa qué requisitos obligatorios del Cap. V del CAA están completos sin bloquear el guardado."""
    nutricion_completa = bool(
        _normalizar_texto(tamano_porcion_declarado)
        and len(tabla_nutricional_json) > 0
        and any(_normalizar_texto(f.valor_100g) for f in tabla_nutricional_json)
    )

    reglas: list[tuple[str, str, str, bool, str]] = [
        ("denominacion_venta", "Denominación de venta", "Identificación", bool(_normalizar_texto(denominacion_venta)), "Falta indicar la denominación de venta."),
        ("lista_ingredientes", "Lista de ingredientes y aditivos", "Composición", bool(_normalizar_texto(lista_ingredientes_texto)), "Falta la lista de ingredientes."),
        ("contenido_neto", "Contenido neto", "Contenidos", bool(_normalizar_texto(contenido_neto)), "Falta especificar el contenido neto."),
        ("razon_social_elaborador", "Razón social del elaborador", "Origen", bool(_normalizar_texto(razon_social_elaborador)), "Falta la razón social del elaborador."),
        ("domicilio_elaborador", "Domicilio del elaborador", "Origen", bool(_normalizar_texto(domicilio_elaborador)), "Falta el domicilio del elaborador."),
        ("pais_origen", "País de origen", "Origen", bool(_normalizar_texto(pais_origen)), "Falta el país de origen."),
        ("rne_elaborador", "RNE del elaborador", "Registros Sanitarios", bool(_normalizar_texto(rne_elaborador)), "Falta el número de RNE."),
        ("rnpa_rppa", "RNPA / RPPA del producto", "Registros Sanitarios", bool(_normalizar_texto(rnpa_rppa)), "Falta el número de RNPA/RPPA."),
        ("codigo_lote_declarado", "Identificación del lote", "Trazabilidad y Conservación", bool(_normalizar_texto(codigo_lote_declarado)), "Falta la identificación del lote."),
        ("fecha_duracion_minima", "Fecha de duración mínima", "Trazabilidad y Conservación", bool(_normalizar_texto(fecha_duracion_minima)), "Falta la fecha de duración mínima o vencimiento."),
        ("condiciones_conservacion", "Condiciones de conservación", "Trazabilidad y Conservación", bool(_normalizar_texto(condiciones_conservacion)), "Faltan las condiciones de conservación."),
        ("informacion_nutricional", "Información nutricional y porción", "Nutrición", nutricion_completa, "Falta la tabla nutricional o el tamaño de porción."),
    ]

    if aplica_peso_escurrido:
        reglas.append(
            ("peso_escurrido", "Peso escurrido", "Contenidos", bool(_normalizar_texto(peso_escurrido)), "Falta indicar el peso escurrido.")
        )
    if es_importado:
        reglas.extend([
            ("nombre_importador", "Nombre / Razón social del importador", "Importación", bool(_normalizar_texto(nombre_importador)), "Falta el nombre o razón social del importador."),
            ("domicilio_importador", "Domicilio del importador", "Importación", bool(_normalizar_texto(domicilio_importador)), "Falta el domicilio del importador."),
            ("rne_importador", "RNE del importador", "Importación", bool(_normalizar_texto(rne_importador)), "Falta el RNE del importador."),
        ])
    if aplica_instrucciones_uso:
        reglas.append(
            ("instrucciones_uso", "Instrucciones de uso / preparación", "Trazabilidad y Conservación", bool(_normalizar_texto(instrucciones_uso)), "Faltan las instrucciones de uso.")
        )

    detalle: list[schemas.ItemCompletitudCAAOut] = []
    faltantes: list[str] = []
    completados = 0

    for clave, etiqueta, seccion, ok, motivo in reglas:
        if ok:
            completados += 1
        else:
            faltantes.append(etiqueta)
        detalle.append(
            schemas.ItemCompletitudCAAOut(
                clave=clave,
                etiqueta=etiqueta,
                seccion=seccion,
                obligatorio=True,
                completado=ok,
                motivo_faltante=None if ok else motivo,
            )
        )

    total = len(reglas)
    porcentaje = round((completados / total) * 100) if total > 0 else 100

    return schemas.CompletitudCAAOut(
        porcentaje=porcentaje,
        total_obligatorios=total,
        total_completados=completados,
        esta_completo=completados == total,
        campos_faltantes=faltantes,
        detalle=detalle,
    )


def _sugerir_fecha_duracion(producto: Producto, ultimo_lote: Optional[schemas.LoteResumenRotuloOut]) -> Optional[str]:
    if ultimo_lote is not None:
        return ultimo_lote.fecha_vencimiento.strftime("%d/%m/%Y")
    if producto.dias_vida_util is not None and producto.dias_vida_util > 0:
        return f"Consumir preferentemente dentro de los {producto.dias_vida_util} días de su elaboración"
    return None


def _parsear_tabla(raw: Optional[list[dict]]) -> list[schemas.FilaNutricionalRotuloItem]:
    if not raw:
        return []
    return [schemas.FilaNutricionalRotuloItem(**item) for item in raw]


def _parsear_sellos(raw: Optional[list[dict]]) -> list[schemas.SelloRotuloItem]:
    if not raw:
        return []
    return [schemas.SelloRotuloItem(**item) for item in raw]


def obtener_rotulo_producto(db: Session, producto_id: int) -> schemas.RotuloProductoConsolidadoOut:
    producto = _obtener_producto(db, producto_id)
    auto = _calcular_datos_autocompletados(db, producto)
    rotulo = db.scalar(select(RotuloProducto).where(RotuloProducto.producto_id == producto.id))

    if rotulo is None:
        codigo_lote = auto.ultimo_lote.codigo_lote if auto.ultimo_lote else None
        fecha_duracion = _sugerir_fecha_duracion(producto, auto.ultimo_lote)
        tabla = auto.tabla_nutricional_calculada if auto.tiene_receta_activa else []
        sellos = auto.sellos_calculados if auto.tiene_receta_activa else []
        leyendas = auto.leyendas_calculadas if auto.tiene_receta_activa else []
        ingredientes = auto.lista_ingredientes_calculada if auto.tiene_receta_activa else None
        porcion = auto.tamano_porcion_calculado if auto.tiene_receta_activa else None
        leyenda_vd = auto.leyenda_vd_calculada if auto.tiene_receta_activa else None

        completitud = verificar_completitud_caa(
            denominacion_venta=producto.nombre,
            contenido_neto=None,
            aplica_peso_escurrido=False,
            peso_escurrido=None,
            razon_social_elaborador=auto.razon_social_establecimiento,
            domicilio_elaborador=auto.domicilio_establecimiento,
            pais_origen="Argentina",
            rne_elaborador=None,
            rnpa_rppa=None,
            es_importado=False,
            nombre_importador=None,
            domicilio_importador=None,
            rne_importador=None,
            codigo_lote_declarado=codigo_lote,
            fecha_duracion_minima=fecha_duracion,
            condiciones_conservacion=None,
            aplica_instrucciones_uso=False,
            instrucciones_uso=None,
            lista_ingredientes_texto=ingredientes,
            tamano_porcion_declarado=porcion,
            tabla_nutricional_json=tabla,
        )

        return schemas.RotuloProductoConsolidadoOut(
            id=None,
            producto_id=producto.id,
            producto_nombre=producto.nombre,
            unidad_medida_simbolo=producto.unidad_medida.simbolo if producto.unidad_medida else "",
            envasado_ausencia_cliente=producto.envasado_ausencia_cliente,
            guardado_en_bd=False,
            denominacion_venta=producto.nombre,
            razon_social_elaborador=auto.razon_social_establecimiento,
            domicilio_elaborador=auto.domicilio_establecimiento,
            pais_origen="Argentina",
            lote_origen_id=auto.ultimo_lote.id if auto.ultimo_lote else None,
            codigo_lote_declarado=codigo_lote,
            fecha_duracion_minima=fecha_duracion,
            lista_ingredientes_texto=ingredientes,
            tamano_porcion_declarado=porcion,
            leyenda_vd_declarada=leyenda_vd,
            tabla_nutricional_json=tabla,
            sellos_advertencia_json=sellos,
            leyendas_precautorias_json=leyendas,
            autocompletado=auto,
            completitud_caa=completitud,
        )

    tabla = _parsear_tabla(rotulo.tabla_nutricional_json)
    sellos = _parsear_sellos(rotulo.sellos_advertencia_json)
    leyendas = _parsear_sellos(rotulo.leyendas_precautorias_json)

    lote_ref = next(
        (l for l in auto.lotes_disponibles if l.id == rotulo.lote_origen_id),
        auto.ultimo_lote,
    )

    completitud = verificar_completitud_caa(
        denominacion_venta=rotulo.denominacion_venta,
        contenido_neto=rotulo.contenido_neto,
        aplica_peso_escurrido=rotulo.aplica_peso_escurrido,
        peso_escurrido=rotulo.peso_escurrido,
        razon_social_elaborador=rotulo.razon_social_elaborador,
        domicilio_elaborador=rotulo.domicilio_elaborador,
        pais_origen=rotulo.pais_origen,
        rne_elaborador=rotulo.rne_elaborador,
        rnpa_rppa=rotulo.rnpa_rppa,
        es_importado=rotulo.es_importado,
        nombre_importador=rotulo.nombre_importador,
        domicilio_importador=rotulo.domicilio_importador,
        rne_importador=rotulo.rne_importador,
        codigo_lote_declarado=rotulo.codigo_lote_declarado,
        fecha_duracion_minima=rotulo.fecha_duracion_minima,
        condiciones_conservacion=rotulo.condiciones_conservacion,
        aplica_instrucciones_uso=rotulo.aplica_instrucciones_uso,
        instrucciones_uso=rotulo.instrucciones_uso,
        lista_ingredientes_texto=rotulo.lista_ingredientes_texto,
        tamano_porcion_declarado=rotulo.tamano_porcion_declarado,
        tabla_nutricional_json=tabla,
    )

    return schemas.RotuloProductoConsolidadoOut(
        id=rotulo.id,
        producto_id=producto.id,
        producto_nombre=producto.nombre,
        unidad_medida_simbolo=producto.unidad_medida.simbolo if producto.unidad_medida else "",
        envasado_ausencia_cliente=producto.envasado_ausencia_cliente,
        guardado_en_bd=True,
        denominacion_venta=rotulo.denominacion_venta,
        contenido_neto=rotulo.contenido_neto,
        aplica_peso_escurrido=rotulo.aplica_peso_escurrido,
        peso_escurrido=rotulo.peso_escurrido,
        razon_social_elaborador=rotulo.razon_social_elaborador,
        domicilio_elaborador=rotulo.domicilio_elaborador,
        pais_origen=rotulo.pais_origen,
        rne_elaborador=rotulo.rne_elaborador,
        rnpa_rppa=rotulo.rnpa_rppa,
        es_importado=rotulo.es_importado,
        nombre_importador=rotulo.nombre_importador,
        domicilio_importador=rotulo.domicilio_importador,
        rne_importador=rotulo.rne_importador,
        lote_origen_id=rotulo.lote_origen_id,
        codigo_lote_declarado=rotulo.codigo_lote_declarado,
        fecha_duracion_minima=rotulo.fecha_duracion_minima,
        condiciones_conservacion=rotulo.condiciones_conservacion,
        aplica_instrucciones_uso=rotulo.aplica_instrucciones_uso,
        instrucciones_uso=rotulo.instrucciones_uso,
        lista_ingredientes_texto=rotulo.lista_ingredientes_texto,
        tamano_porcion_declarado=rotulo.tamano_porcion_declarado,
        leyenda_vd_declarada=rotulo.leyenda_vd_declarada,
        tabla_nutricional_json=tabla,
        sellos_advertencia_json=sellos,
        leyendas_precautorias_json=leyendas,
        ingredientes_modificado_manualmente=rotulo.ingredientes_modificado_manualmente,
        nutricion_modificada_manualmente=rotulo.nutricion_modificada_manualmente,
        sellos_modificados_manualmente=rotulo.sellos_modificados_manualmente,
        lote_modificado_manualmente=rotulo.lote_modificado_manualmente,
        ingredientes_difiere_de_receta=_difiere_ingredientes(rotulo.lista_ingredientes_texto, auto),
        nutricion_difiere_de_receta=_difiere_nutricion(
            tabla, rotulo.tamano_porcion_declarado, rotulo.leyenda_vd_declarada, auto
        ),
        sellos_difieren_de_receta=_difiere_sellos(sellos, leyendas, auto),
        lote_difiere_de_ultimo_lote=_difiere_lote(
            rotulo.codigo_lote_declarado, rotulo.fecha_duracion_minima, lote_ref
        ),
        fecha_actualizacion=rotulo.fecha_actualizacion,
        actualizado_por_nombre=rotulo.actualizado_por_nombre,
        autocompletado=auto,
        completitud_caa=completitud,
    )


def guardar_rotulo_producto(
    db: Session,
    producto_id: int,
    payload: schemas.RotuloProductoUpdateIn,
    usuario_id: int,
) -> schemas.RotuloProductoConsolidadoOut:
    """Crea o actualiza el rótulo de un producto aceptando borradores parciales sin bloqueo."""
    producto = _obtener_producto(db, producto_id)
    auto = _calcular_datos_autocompletados(db, producto)

    rotulo = db.scalar(select(RotuloProducto).where(RotuloProducto.producto_id == producto.id))
    if rotulo is None:
        rotulo = RotuloProducto(producto_id=producto.id)
        db.add(rotulo)

    rotulo.receta_origen_id = auto.receta_id
    rotulo.denominacion_venta = _normalizar_texto(payload.denominacion_venta)
    rotulo.contenido_neto = _normalizar_texto(payload.contenido_neto)
    rotulo.aplica_peso_escurrido = payload.aplica_peso_escurrido
    rotulo.peso_escurrido = (
        _normalizar_texto(payload.peso_escurrido) if payload.aplica_peso_escurrido else None
    )

    rotulo.razon_social_elaborador = _normalizar_texto(payload.razon_social_elaborador)
    rotulo.domicilio_elaborador = _normalizar_texto(payload.domicilio_elaborador)
    rotulo.pais_origen = _normalizar_texto(payload.pais_origen) or "Argentina"
    rotulo.rne_elaborador = _normalizar_texto(payload.rne_elaborador)
    rotulo.rnpa_rppa = _normalizar_texto(payload.rnpa_rppa)

    rotulo.es_importado = payload.es_importado
    if payload.es_importado:
        rotulo.nombre_importador = _normalizar_texto(payload.nombre_importador)
        rotulo.domicilio_importador = _normalizar_texto(payload.domicilio_importador)
        rotulo.rne_importador = _normalizar_texto(payload.rne_importador)
    else:
        rotulo.nombre_importador = None
        rotulo.domicilio_importador = None
        rotulo.rne_importador = None

    rotulo.condiciones_conservacion = _normalizar_texto(payload.condiciones_conservacion)
    rotulo.aplica_instrucciones_uso = payload.aplica_instrucciones_uso
    rotulo.instrucciones_uso = (
        _normalizar_texto(payload.instrucciones_uso) if payload.aplica_instrucciones_uso else None
    )

    # Bloque 1: Ingredientes
    if payload.restaurar_ingredientes_automatico:
        rotulo.lista_ingredientes_texto = auto.lista_ingredientes_calculada
        rotulo.ingredientes_modificado_manualmente = False
    else:
        rotulo.lista_ingredientes_texto = _normalizar_texto(payload.lista_ingredientes_texto)
        rotulo.ingredientes_modificado_manualmente = _difiere_ingredientes(
            rotulo.lista_ingredientes_texto, auto
        )

    # Bloque 2: Información Nutricional
    if payload.restaurar_nutricion_automatico:
        rotulo.tabla_nutricional_json = [
            f.model_dump() for f in auto.tabla_nutricional_calculada
        ]
        rotulo.tamano_porcion_declarado = auto.tamano_porcion_calculado
        rotulo.leyenda_vd_declarada = auto.leyenda_vd_calculada
        rotulo.nutricion_modificada_manualmente = False
    else:
        tabla_items = payload.tabla_nutricional_json or []
        rotulo.tabla_nutricional_json = [f.model_dump() for f in tabla_items]
        rotulo.tamano_porcion_declarado = _normalizar_texto(payload.tamano_porcion_declarado)
        rotulo.leyenda_vd_declarada = _normalizar_texto(payload.leyenda_vd_declarada)
        rotulo.nutricion_modificada_manualmente = _difiere_nutricion(
            tabla_items,
            rotulo.tamano_porcion_declarado,
            rotulo.leyenda_vd_declarada,
            auto,
        )

    # Bloque 3: Sellos y Leyendas (Ley 27.642)
    if payload.restaurar_sellos_automatico:
        rotulo.sellos_advertencia_json = [s.model_dump() for s in auto.sellos_calculados]
        rotulo.leyendas_precautorias_json = [l.model_dump() for l in auto.leyendas_calculadas]
        rotulo.sellos_modificados_manualmente = False
    else:
        sellos_items = payload.sellos_advertencia_json or []
        leyendas_items = payload.leyendas_precautorias_json or []
        rotulo.sellos_advertencia_json = [s.model_dump() for s in sellos_items]
        rotulo.leyendas_precautorias_json = [l.model_dump() for l in leyendas_items]
        rotulo.sellos_modificados_manualmente = _difiere_sellos(
            sellos_items, leyendas_items, auto
        )

    # Bloque 4: Lote y Vencimiento
    lote_ref = next(
        (l for l in auto.lotes_disponibles if l.id == payload.lote_origen_id),
        auto.ultimo_lote,
    )
    if payload.restaurar_lote_automatico and lote_ref is not None:
        rotulo.lote_origen_id = lote_ref.id
        rotulo.codigo_lote_declarado = lote_ref.codigo_lote
        rotulo.fecha_duracion_minima = lote_ref.fecha_vencimiento.strftime("%d/%m/%Y")
        rotulo.lote_modificado_manualmente = False
    else:
        rotulo.lote_origen_id = lote_ref.id if lote_ref else None
        rotulo.codigo_lote_declarado = _normalizar_texto(payload.codigo_lote_declarado)
        rotulo.fecha_duracion_minima = _normalizar_texto(payload.fecha_duracion_minima)
        rotulo.lote_modificado_manualmente = _difiere_lote(
            rotulo.codigo_lote_declarado, rotulo.fecha_duracion_minima, lote_ref
        )

    rotulo.actualizado_por_id = usuario_id
    rotulo.fecha_actualizacion = datetime.now()

    db.commit()
    db.refresh(rotulo)
    return obtener_rotulo_producto(db, producto_id)
