from datetime import datetime
import hashlib
import json
from typing import Optional
import unicodedata
from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload

from src.configuracion.services import obtener_o_crear_configuracion
from src.lotes.models import Lote
from src.productos.models import Producto
from src.recetas import services as recetas_services
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta
from src.rotulado import services as rotulado_services
from src.rotulado_producto import exceptions, schemas
from src.rotulado_producto.constants import (
    CodigoAlergenoCAA,
    ETIQUETAS_ALERGENOS_CAA,
    EstadoValidacionAlergenos,
    LEYENDA_BORRADOR_ROTULO,
)
from src.rotulado_producto.models import RotuloProducto


def asegurar_columnas_alergenos_y_conservacion(db: Session) -> None:
    """Agrega columnas nuevas de alérgenos y conservación en SQLite si la tabla ya existía."""
    columnas_por_tabla = {
        "insumos": {
            "alergenos_declarados_json": "TEXT",
        },
        "rotulos_producto": {
            "alergenos_presentes_json": "TEXT",
            "alergenos_contaminacion_cruzada_json": "TEXT",
            "leyenda_alergenos_declarada": "TEXT",
            "temp_conservacion_min_c": "FLOAT",
            "temp_conservacion_max_c": "FLOAT",
            "durabilidad_antes_abrir": "VARCHAR(200)",
            "durabilidad_despues_abrir": "VARCHAR(200)",
            "alergenos_modificados_manualmente": "BOOLEAN NOT NULL DEFAULT 0",
            "conservacion_modificada_manualmente": "BOOLEAN NOT NULL DEFAULT 0",
            "estado_validacion_alergenos": "VARCHAR(20) NOT NULL DEFAULT 'SUGERIDO'",
            "hash_firma_receta_alergenos": "VARCHAR(64)",
            "confirmado_alergenos_por_id": "INTEGER",
            "fecha_confirmacion_alergenos": "DATETIME",
        },
    }
    for tabla, columnas in columnas_por_tabla.items():
        existentes = {
            row[1]
            for row in db.execute(text(f"PRAGMA table_info({tabla})")).fetchall()
        }
        if not existentes:
            continue
        for col, tipo in columnas.items():
            if col not in existentes:
                db.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {col} {tipo}"))
    db.commit()


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


def _unir_con_y(etiquetas: list[str]) -> str:
    if not etiquetas:
        return ""
    if len(etiquetas) == 1:
        return etiquetas[0]
    ultima = etiquetas[-1]
    conjuncion = " E " if ultima.startswith(("I", "HI", "Í")) else " Y "
    if len(etiquetas) == 2:
        return f"{etiquetas[0]}{conjuncion}{ultima}"
    return f"{', '.join(etiquetas[:-1])}{conjuncion}{ultima}"


def _redactar_clausula_alergenos(
    prefijo: str,
    items: list[schemas.AlergenoRotuloItem],
) -> Optional[str]:
    if not items:
        return None
    directos: list[str] = []
    derivados: list[str] = []
    vistos_directos: set[CodigoAlergenoCAA] = set()
    vistos_derivados: set[CodigoAlergenoCAA] = set()

    for it in items:
        etiqueta = ETIQUETAS_ALERGENOS_CAA.get(it.codigo, it.codigo.value)
        if not it.es_derivado:
            if it.codigo not in vistos_directos:
                vistos_directos.add(it.codigo)
                directos.append(etiqueta)
        else:
            if it.codigo not in vistos_derivados and it.codigo not in vistos_directos:
                vistos_derivados.add(it.codigo)
                derivados.append(etiqueta)

    if directos and derivados:
        return f"{prefijo} {_unir_con_y(directos)} Y DERIVADOS DE {_unir_con_y(derivados)}."
    if directos:
        return f"{prefijo} {_unir_con_y(directos)}."
    if derivados:
        return f"{prefijo} DERIVADOS DE {_unir_con_y(derivados)}."
    return None


def generar_leyenda_alergenos_caa(
    presentes: list[schemas.AlergenoRotuloItem],
    cruzada: list[schemas.AlergenoRotuloItem],
) -> Optional[str]:
    """Redacta la leyenda formal en MAYÚSCULAS según Art. 235 séptimo del CAA (sin 'CONTIENE GLUTEN')."""
    codigos_presentes = {it.codigo for it in presentes}
    cruzada_filtrada = [it for it in cruzada if it.codigo not in codigos_presentes]

    partes = [
        p
        for p in (
            _redactar_clausula_alergenos("CONTIENE", presentes),
            _redactar_clausula_alergenos("PUEDE CONTENER", cruzada_filtrada),
        )
        if p
    ]
    return " ".join(partes) if partes else None


def _consolidar_alergenos_receta(
    receta: Receta,
) -> tuple[list[schemas.AlergenoRotuloItem], list[schemas.OrigenAlergenoOut]]:
    """Consolida alérgenos y derivados desde los insumos (no envases) de una receta."""
    insumos_map = recetas_services._consolidar_insumos_receta(receta)
    agregados: dict[CodigoAlergenoCAA, dict] = {}

    for data in insumos_map.values():
        insumo = data["insumo"]
        raw_alergenos = getattr(insumo, "alergenos_declarados_json", None) or []
        for entry in raw_alergenos:
            cod_raw = entry.get("codigo")
            if not cod_raw:
                continue
            try:
                codigo = CodigoAlergenoCAA(cod_raw)
            except ValueError:
                continue
            es_derivado = bool(entry.get("es_derivado", False))
            if codigo not in agregados:
                agregados[codigo] = {
                    "codigo": codigo,
                    "es_derivado": es_derivado,
                    "insumos": [insumo.nombre],
                }
            else:
                # Si al menos un insumo lo aporta directo, prevalece sustancia directa (es_derivado=False)
                if not es_derivado:
                    agregados[codigo]["es_derivado"] = False
                if insumo.nombre not in agregados[codigo]["insumos"]:
                    agregados[codigo]["insumos"].append(insumo.nombre)

    orden_catalogo = list(CodigoAlergenoCAA)
    items_ordenados = sorted(
        agregados.values(),
        key=lambda x: orden_catalogo.index(x["codigo"]),
    )

    items = [
        schemas.AlergenoRotuloItem(codigo=x["codigo"], es_derivado=x["es_derivado"])
        for x in items_ordenados
    ]
    detalle = [
        schemas.OrigenAlergenoOut(
            codigo=x["codigo"],
            etiqueta=ETIQUETAS_ALERGENOS_CAA[x["codigo"]],
            es_derivado=x["es_derivado"],
            insumos_fuente=x["insumos"],
        )
        for x in items_ordenados
    ]
    return items, detalle


def _sugerir_conservacion(
    producto: Producto,
    receta: Optional[Receta],
) -> schemas.ConservacionSugeridaOut:
    """Propone condiciones de conservación y durabilidad según producto y receta activa."""
    durabilidad_antes = (
        f"{producto.dias_vida_util} días en su envase original cerrado"
        if producto.dias_vida_util is not None and producto.dias_vida_util > 0
        else None
    )

    if producto.es_liquido:
        return schemas.ConservacionSugeridaOut(
            temp_conservacion_min_c=2.0,
            temp_conservacion_max_c=8.0,
            durabilidad_antes_abrir=durabilidad_antes,
            durabilidad_despues_abrir="Mantener refrigerado y consumir dentro de las 48 horas",
            condiciones_conservacion="Conservar refrigerado entre 2 °C y 8 °C. Agitar antes de usar.",
        )

    return schemas.ConservacionSugeridaOut(
        temp_conservacion_min_c=15.0,
        temp_conservacion_max_c=25.0,
        durabilidad_antes_abrir=durabilidad_antes,
        durabilidad_despues_abrir="Conservar en recipiente hermético y consumir dentro de los 5 días",
        condiciones_conservacion="Conservar en lugar fresco y seco (15 °C a 25 °C), al abrigo de la luz solar.",
    )


def _calcular_firma_receta_alergenos(
    receta: Optional[Receta],
    alergenos_calc: list[schemas.AlergenoRotuloItem],
    producto: Producto,
) -> Optional[str]:
    if receta is None:
        return None
    payload = {
        "receta_id": receta.id,
        "alergenos": [
            {"codigo": it.codigo.value, "es_derivado": it.es_derivado}
            for it in alergenos_calc
        ],
        "dias_vida_util": producto.dias_vida_util,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _calcular_datos_autocompletados(
    db: Session,
    producto: Producto,
) -> tuple[schemas.DatosAutocompletadosRecetaOut, Optional[str]]:
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
    alergenos_calc: list[schemas.AlergenoRotuloItem] = []
    detalle_origen_alergenos: list[schemas.OrigenAlergenoOut] = []
    leyenda_alergenos_calc: Optional[str] = None

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

        alergenos_calc, detalle_origen_alergenos = _consolidar_alergenos_receta(receta_activa)
        leyenda_alergenos_calc = generar_leyenda_alergenos_caa(alergenos_calc, [])

    conservacion_sugerida = _sugerir_conservacion(producto, receta_activa)
    firma_actual = _calcular_firma_receta_alergenos(receta_activa, alergenos_calc, producto)

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

    auto = schemas.DatosAutocompletadosRecetaOut(
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
        alergenos_presentes_calculados=alergenos_calc,
        detalle_origen_alergenos=detalle_origen_alergenos,
        leyenda_alergenos_calculada=leyenda_alergenos_calc,
        conservacion_sugerida=conservacion_sugerida,
    )
    return auto, firma_actual


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


def _serializar_alergenos(items: list[schemas.AlergenoRotuloItem]) -> list[tuple[str, bool]]:
    return sorted((it.codigo.value, bool(it.es_derivado)) for it in items)


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


def _difiere_alergenos(
    presentes: list[schemas.AlergenoRotuloItem],
    cruzada: list[schemas.AlergenoRotuloItem],
    leyenda_actual: Optional[str],
    auto: schemas.DatosAutocompletadosRecetaOut,
) -> bool:
    esperada = generar_leyenda_alergenos_caa(
        auto.alergenos_presentes_calculados if auto.tiene_receta_activa else presentes,
        cruzada,
    )
    if auto.tiene_receta_activa and _serializar_alergenos(presentes) != _serializar_alergenos(
        auto.alergenos_presentes_calculados
    ):
        return True
    return _clave_comparacion(leyenda_actual) != _clave_comparacion(esperada)


def _difiere_conservacion(
    temp_min: Optional[float],
    temp_max: Optional[float],
    dur_antes: Optional[str],
    dur_despues: Optional[str],
    condiciones: Optional[str],
    auto: schemas.DatosAutocompletadosRecetaOut,
) -> bool:
    sug = auto.conservacion_sugerida
    if sug is None:
        return False
    return (
        temp_min != sug.temp_conservacion_min_c
        or temp_max != sug.temp_conservacion_max_c
        or _clave_comparacion(dur_antes) != _clave_comparacion(sug.durabilidad_antes_abrir)
        or _clave_comparacion(dur_despues) != _clave_comparacion(sug.durabilidad_despues_abrir)
        or _clave_comparacion(condiciones) != _clave_comparacion(sug.condiciones_conservacion)
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
    estado_validacion_alergenos: EstadoValidacionAlergenos = EstadoValidacionAlergenos.SUGERIDO,
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
        ("alergenos_validados", "Declaración de alérgenos y conservación confirmada", "Alérgenos y Conservación", estado_validacion_alergenos == EstadoValidacionAlergenos.CONFIRMADO, "Falta confirmar la declaración de alérgenos y conservación."),
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


def _parsear_alergenos(raw: Optional[list[dict]]) -> list[schemas.AlergenoRotuloItem]:
    if not raw:
        return []
    items: list[schemas.AlergenoRotuloItem] = []
    for item in raw:
        try:
            items.append(schemas.AlergenoRotuloItem(**item))
        except Exception:
            continue
    return items


def obtener_rotulo_producto(db: Session, producto_id: int) -> schemas.RotuloProductoConsolidadoOut:
    producto = _obtener_producto(db, producto_id)
    auto, firma_actual = _calcular_datos_autocompletados(db, producto)
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
        alergenos_pres = auto.alergenos_presentes_calculados if auto.tiene_receta_activa else []
        leyenda_alergenos = auto.leyenda_alergenos_calculada if auto.tiene_receta_activa else None
        sug_cons = auto.conservacion_sugerida

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
            condiciones_conservacion=sug_cons.condiciones_conservacion if sug_cons else None,
            aplica_instrucciones_uso=False,
            instrucciones_uso=None,
            lista_ingredientes_texto=ingredientes,
            tamano_porcion_declarado=porcion,
            tabla_nutricional_json=tabla,
            estado_validacion_alergenos=EstadoValidacionAlergenos.SUGERIDO,
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
            condiciones_conservacion=sug_cons.condiciones_conservacion if sug_cons else None,
            temp_conservacion_min_c=sug_cons.temp_conservacion_min_c if sug_cons else None,
            temp_conservacion_max_c=sug_cons.temp_conservacion_max_c if sug_cons else None,
            durabilidad_antes_abrir=sug_cons.durabilidad_antes_abrir if sug_cons else None,
            durabilidad_despues_abrir=sug_cons.durabilidad_despues_abrir if sug_cons else None,
            lista_ingredientes_texto=ingredientes,
            tamano_porcion_declarado=porcion,
            leyenda_vd_declarada=leyenda_vd,
            tabla_nutricional_json=tabla,
            sellos_advertencia_json=sellos,
            leyendas_precautorias_json=leyendas,
            alergenos_presentes_json=alergenos_pres,
            alergenos_contaminacion_cruzada_json=[],
            leyenda_alergenos_declarada=leyenda_alergenos,
            estado_validacion_alergenos=EstadoValidacionAlergenos.SUGERIDO,
            autocompletado=auto,
            completitud_caa=completitud,
        )

    tabla = _parsear_tabla(rotulo.tabla_nutricional_json)
    sellos = _parsear_sellos(rotulo.sellos_advertencia_json)
    leyendas = _parsear_sellos(rotulo.leyendas_precautorias_json)
    alergenos_pres = _parsear_alergenos(rotulo.alergenos_presentes_json)
    alergenos_cruz = _parsear_alergenos(rotulo.alergenos_contaminacion_cruzada_json)
    leyenda_alergenos = rotulo.leyenda_alergenos_declarada

    # Detección de invalidación de confirmación cuando cambia la receta activa o sus insumos
    confirmacion_invalidada = (
        rotulo.estado_validacion_alergenos == EstadoValidacionAlergenos.CONFIRMADO.value
        and rotulo.hash_firma_receta_alergenos != firma_actual
    )
    estado_efectivo = (
        EstadoValidacionAlergenos.SUGERIDO
        if confirmacion_invalidada or rotulo.estado_validacion_alergenos != EstadoValidacionAlergenos.CONFIRMADO.value
        else EstadoValidacionAlergenos.CONFIRMADO
    )

    if confirmacion_invalidada and auto.tiene_receta_activa and not rotulo.alergenos_modificados_manualmente:
        alergenos_pres = auto.alergenos_presentes_calculados
        cods_pres = {it.codigo for it in alergenos_pres}
        alergenos_cruz = [it for it in alergenos_cruz if it.codigo not in cods_pres]
        leyenda_alergenos = generar_leyenda_alergenos_caa(alergenos_pres, alergenos_cruz)

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
        estado_validacion_alergenos=estado_efectivo,
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
        alergenos_presentes_json=alergenos_pres,
        alergenos_contaminacion_cruzada_json=alergenos_cruz,
        leyenda_alergenos_declarada=leyenda_alergenos,
        temp_conservacion_min_c=rotulo.temp_conservacion_min_c,
        temp_conservacion_max_c=rotulo.temp_conservacion_max_c,
        durabilidad_antes_abrir=rotulo.durabilidad_antes_abrir,
        durabilidad_despues_abrir=rotulo.durabilidad_despues_abrir,
        ingredientes_modificado_manualmente=rotulo.ingredientes_modificado_manualmente,
        nutricion_modificada_manualmente=rotulo.nutricion_modificada_manualmente,
        sellos_modificados_manualmente=rotulo.sellos_modificados_manualmente,
        lote_modificado_manualmente=rotulo.lote_modificado_manualmente,
        alergenos_modificados_manualmente=rotulo.alergenos_modificados_manualmente,
        conservacion_modificada_manualmente=rotulo.conservacion_modificada_manualmente,
        ingredientes_difiere_de_receta=_difiere_ingredientes(rotulo.lista_ingredientes_texto, auto),
        nutricion_difiere_de_receta=_difiere_nutricion(
            tabla, rotulo.tamano_porcion_declarado, rotulo.leyenda_vd_declarada, auto
        ),
        sellos_difieren_de_receta=_difiere_sellos(sellos, leyendas, auto),
        lote_difiere_de_ultimo_lote=_difiere_lote(
            rotulo.codigo_lote_declarado, rotulo.fecha_duracion_minima, lote_ref
        ),
        alergenos_difieren_de_receta=_difiere_alergenos(
            alergenos_pres, alergenos_cruz, leyenda_alergenos, auto
        ),
        conservacion_difiere_de_sugerida=_difiere_conservacion(
            rotulo.temp_conservacion_min_c,
            rotulo.temp_conservacion_max_c,
            rotulo.durabilidad_antes_abrir,
            rotulo.durabilidad_despues_abrir,
            rotulo.condiciones_conservacion,
            auto,
        ),
        estado_validacion_alergenos=estado_efectivo,
        confirmacion_invalidada_por_cambio_receta=confirmacion_invalidada,
        fecha_confirmacion_alergenos=rotulo.fecha_confirmacion_alergenos,
        confirmado_alergenos_por_nombre=rotulo.confirmado_alergenos_por_nombre,
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
    auto, firma_actual = _calcular_datos_autocompletados(db, producto)

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

    # Conservación e instrucciones
    if payload.restaurar_conservacion_automatico and auto.conservacion_sugerida is not None:
        sug = auto.conservacion_sugerida
        rotulo.temp_conservacion_min_c = sug.temp_conservacion_min_c
        rotulo.temp_conservacion_max_c = sug.temp_conservacion_max_c
        rotulo.durabilidad_antes_abrir = sug.durabilidad_antes_abrir
        rotulo.durabilidad_despues_abrir = sug.durabilidad_despues_abrir
        rotulo.condiciones_conservacion = sug.condiciones_conservacion
        rotulo.conservacion_modificada_manualmente = False
    else:
        rotulo.temp_conservacion_min_c = payload.temp_conservacion_min_c
        rotulo.temp_conservacion_max_c = payload.temp_conservacion_max_c
        rotulo.durabilidad_antes_abrir = _normalizar_texto(payload.durabilidad_antes_abrir)
        rotulo.durabilidad_despues_abrir = _normalizar_texto(payload.durabilidad_despues_abrir)
        rotulo.condiciones_conservacion = _normalizar_texto(payload.condiciones_conservacion)
        rotulo.conservacion_modificada_manualmente = _difiere_conservacion(
            rotulo.temp_conservacion_min_c,
            rotulo.temp_conservacion_max_c,
            rotulo.durabilidad_antes_abrir,
            rotulo.durabilidad_despues_abrir,
            rotulo.condiciones_conservacion,
            auto,
        )

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

    # Bloque 5: Alérgenos y Contaminación Cruzada (Art. 235 séptimo CAA)
    cruzada_raw = payload.alergenos_contaminacion_cruzada_json or []
    if payload.restaurar_alergenos_automatico:
        presentes_items = list(auto.alergenos_presentes_calculados)
        codigos_presentes = {it.codigo for it in presentes_items}
        cruzada_items = [it for it in cruzada_raw if it.codigo not in codigos_presentes]
        leyenda_final = generar_leyenda_alergenos_caa(presentes_items, cruzada_items)
        rotulo.alergenos_modificados_manualmente = False
    else:
        presentes_items = (
            payload.alergenos_presentes_json
            if payload.alergenos_presentes_json is not None
            else list(auto.alergenos_presentes_calculados)
        )
        codigos_presentes = {it.codigo for it in presentes_items}
        cruzada_items = [it for it in cruzada_raw if it.codigo not in codigos_presentes]
        leyenda_manual = _normalizar_texto(payload.leyenda_alergenos_declarada)
        leyenda_final = (
            leyenda_manual
            if leyenda_manual is not None
            else generar_leyenda_alergenos_caa(presentes_items, cruzada_items)
        )
        rotulo.alergenos_modificados_manualmente = _difiere_alergenos(
            presentes_items, cruzada_items, leyenda_final, auto
        )

    rotulo.alergenos_presentes_json = [
        {"codigo": it.codigo.value, "es_derivado": it.es_derivado}
        for it in presentes_items
    ]
    rotulo.alergenos_contaminacion_cruzada_json = [
        {"codigo": it.codigo.value, "es_derivado": it.es_derivado}
        for it in cruzada_items
    ]
    rotulo.leyenda_alergenos_declarada = leyenda_final

    # Estado de validación y auditoría de confirmación
    if payload.confirmar_alergenos_conservacion:
        rotulo.estado_validacion_alergenos = EstadoValidacionAlergenos.CONFIRMADO.value
        rotulo.hash_firma_receta_alergenos = firma_actual
        rotulo.confirmado_alergenos_por_id = usuario_id
        rotulo.fecha_confirmacion_alergenos = datetime.now()
    elif (
        rotulo.estado_validacion_alergenos == EstadoValidacionAlergenos.CONFIRMADO.value
        and rotulo.hash_firma_receta_alergenos != firma_actual
    ):
        rotulo.estado_validacion_alergenos = EstadoValidacionAlergenos.SUGERIDO.value

    rotulo.actualizado_por_id = usuario_id
    rotulo.fecha_actualizacion = datetime.now()

    db.commit()
    db.refresh(rotulo)
    return obtener_rotulo_producto(db, producto_id)


def _construir_aviso_sin_sellos(
    tiene_receta_activa: bool,
    modulo_octogonos_activo: bool,
    dictamen_aplicabilidad: Optional[str],
    dictamen_titulo: Optional[str],
    motivo_aplicabilidad: Optional[str],
    sellos_calculables_receta: bool,
    mensaje_bloqueo_sellos: Optional[str],
    sellos: list[schemas.SelloRotuloItem],
    leyendas: list[schemas.SelloRotuloItem],
) -> tuple[Optional[str], bool]:
    """Determina si el bloque de sellos es calculable y qué aviso mostrar cuando está vacío."""
    if sellos or leyendas:
        return None, True
    if not tiene_receta_activa:
        return "Sin receta activa para evaluar rotulado frontal (Ley 27.642).", False
    if not modulo_octogonos_activo:
        return "Módulo de octógonos desactivado en la configuración del sistema.", True
    if dictamen_aplicabilidad in ("NO_APLICA", "EXCEPTUADO"):
        if dictamen_titulo and motivo_aplicabilidad:
            return f"{dictamen_titulo}: {motivo_aplicabilidad}", True
        return motivo_aplicabilidad or dictamen_titulo or "No corresponde rotulado frontal.", True
    if not sellos_calculables_receta:
        return (
            mensaje_bloqueo_sellos
            or "Hay datos nutricionales o equivalencias incompletas para calcular los sellos de advertencia y leyendas precautorias.",
            False,
        )
    return "No corresponden sellos de advertencia ni leyendas precautorias según Ley 27.642.", True


def _construir_nutricion_preview(
    db: Session,
    rotulo: schemas.RotuloProductoConsolidadoOut,
    es_liquido: bool,
) -> tuple[schemas.NutricionRotuloPreviewOut, bool]:
    """Evalúa la completitud de la tabla nutricional para la vista previa del rótulo."""
    base_etiqueta = "100 ml" if es_liquido else "100 g"
    tamano_porcion = _normalizar_texto(rotulo.tamano_porcion_declarado)
    filas = rotulo.tabla_nutricional_json

    motivo_incompleta: Optional[str] = None
    if rotulo.autocompletado.tiene_receta_activa and rotulo.autocompletado.receta_id is not None:
        info_nutri = recetas_services.obtener_informacion_nutricional(
            db, rotulo.autocompletado.receta_id
        )
        if not info_nutri.es_calculable and not filas:
            detalles: list[str] = []
            if info_nutri.insumos_sin_equivalencia:
                nombres = ", ".join(i.nombre for i in info_nutri.insumos_sin_equivalencia)
                detalles.append(f"insumos sin equivalencia a gramos ({nombres})")
            if info_nutri.insumos_nutricion_pendiente:
                nombres = ", ".join(i.nombre for i in info_nutri.insumos_nutricion_pendiente)
                detalles.append(f"insumos con nutrición pendiente ({nombres})")
            motivo_incompleta = (
                "Faltan datos para calcular la tabla nutricional: " + "; ".join(detalles) + "."
                if detalles
                else "La tabla nutricional no es calculable con los datos actuales de la receta."
            )
    elif not filas:
        motivo_incompleta = "No hay receta activa vinculada al producto ni tabla nutricional declarada."

    if not filas and motivo_incompleta is None:
        motivo_incompleta = "La tabla nutricional no contiene filas declaradas."
    elif filas and tamano_porcion is None:
        motivo_incompleta = "Falta declarar el tamaño de la porción."

    es_completa = len(filas) > 0 and tamano_porcion is not None and motivo_incompleta is None
    nutricion_out = schemas.NutricionRotuloPreviewOut(
        es_completa=es_completa,
        motivo_incompleta=motivo_incompleta,
        tamano_porcion=tamano_porcion,
        base_etiqueta=base_etiqueta,
        filas=filas,
        leyenda_vd=rotulo.leyenda_vd_declarada,
    )
    return nutricion_out, not es_completa


def _construir_advertencias_preview(
    rotulo: schemas.RotuloProductoConsolidadoOut,
    tabla_nutricional_incompleta: bool,
    motivo_nutricion_incompleta: Optional[str],
) -> list[str]:
    """Construye la lista de advertencias destacadas para el banner de completitud."""
    advertencias: list[str] = []
    if not rotulo.autocompletado.tiene_receta_activa:
        advertencias.append(
            "El producto no tiene una receta activa; los datos automáticos no pudieron calcularse."
        )
    if tabla_nutricional_incompleta:
        advertencias.append(
            f"Tabla nutricional incompleta: {motivo_nutricion_incompleta or 'faltan datos nutricionales.'}"
        )
    if rotulo.estado_validacion_alergenos != EstadoValidacionAlergenos.CONFIRMADO:
        if rotulo.confirmacion_invalidada_por_cambio_receta:
            advertencias.append(
                "La confirmación de alérgenos fue invalidada por cambios en la receta o insumos; requiere nueva revisión."
            )
        else:
            advertencias.append(
                "La declaración de alérgenos y conservación aún está en estado SUGERIDO y requiere confirmación."
            )
    if not rotulo.completitud_caa.esta_completo:
        faltantes = ", ".join(rotulo.completitud_caa.campos_faltantes)
        advertencias.append(
            f"Faltan {len(rotulo.completitud_caa.campos_faltantes)} dato(s) obligatorio(s) CAA: {faltantes}."
        )
    return advertencias


def obtener_vista_previa_rotulo(db: Session, producto_id: int) -> schemas.VistaPreviaRotuloOut:
    """Consolida todos los elementos normativos del borrador del rótulo para vista previa e impresión."""
    producto = _obtener_producto(db, producto_id)
    rotulo = obtener_rotulo_producto(db, producto_id)
    auto = rotulo.autocompletado

    modulo_octogonos_activo = True
    dictamen_aplicabilidad = auto.dictamen_aplicabilidad
    dictamen_titulo: Optional[str] = None
    motivo_aplicabilidad: Optional[str] = None
    sellos_calculables_receta = False
    mensaje_bloqueo_sellos: Optional[str] = None

    if auto.tiene_receta_activa and auto.receta_id is not None:
        aplicabilidad = rotulado_services.evaluar_aplicabilidad_frontal(db, auto.receta_id)
        modulo_octogonos_activo = aplicabilidad.modulo_octogonos_activo
        dictamen_aplicabilidad = aplicabilidad.dictamen.value
        dictamen_titulo = aplicabilidad.dictamen_titulo
        motivo_aplicabilidad = aplicabilidad.motivo

        sellos_calc = rotulado_services.calcular_sellos_advertencia(db, auto.receta_id)
        sellos_calculables_receta = sellos_calc.es_calculable
        mensaje_bloqueo_sellos = _normalizar_texto(sellos_calc.mensaje_bloqueo)

    aviso_sin_sellos, sellos_calculables = _construir_aviso_sin_sellos(
        tiene_receta_activa=auto.tiene_receta_activa,
        modulo_octogonos_activo=modulo_octogonos_activo,
        dictamen_aplicabilidad=dictamen_aplicabilidad,
        dictamen_titulo=dictamen_titulo,
        motivo_aplicabilidad=motivo_aplicabilidad,
        sellos_calculables_receta=sellos_calculables_receta,
        mensaje_bloqueo_sellos=mensaje_bloqueo_sellos,
        sellos=rotulo.sellos_advertencia_json,
        leyendas=rotulo.leyendas_precautorias_json,
    )

    cara_principal = schemas.CaraPrincipalRotuloOut(
        denominacion_venta=rotulo.denominacion_venta,
        contenido_neto=rotulo.contenido_neto,
        aplica_peso_escurrido=rotulo.aplica_peso_escurrido,
        peso_escurrido=rotulo.peso_escurrido,
        modulo_octogonos_activo=modulo_octogonos_activo,
        dictamen_aplicabilidad=dictamen_aplicabilidad,
        dictamen_titulo=dictamen_titulo,
        motivo_aplicabilidad=motivo_aplicabilidad,
        sellos_calculables=sellos_calculables,
        sellos_advertencia=rotulo.sellos_advertencia_json,
        leyendas_precautorias=rotulo.leyendas_precautorias_json,
        aviso_sin_sellos=aviso_sin_sellos,
    )

    nutricion, tabla_nutricional_incompleta = _construir_nutricion_preview(
        db, rotulo, producto.es_liquido
    )

    origen = schemas.OrigenRotuloPreviewOut(
        razon_social_elaborador=rotulo.razon_social_elaborador,
        domicilio_elaborador=rotulo.domicilio_elaborador,
        pais_origen=rotulo.pais_origen,
        rne_elaborador=rotulo.rne_elaborador,
        rnpa_rppa=rotulo.rnpa_rppa,
        es_importado=rotulo.es_importado,
        nombre_importador=rotulo.nombre_importador,
        domicilio_importador=rotulo.domicilio_importador,
        rne_importador=rotulo.rne_importador,
    )

    conservacion_lote = schemas.ConservacionLotePreviewOut(
        codigo_lote=rotulo.codigo_lote_declarado,
        fecha_duracion_minima=rotulo.fecha_duracion_minima,
        temp_conservacion_min_c=rotulo.temp_conservacion_min_c,
        temp_conservacion_max_c=rotulo.temp_conservacion_max_c,
        durabilidad_antes_abrir=rotulo.durabilidad_antes_abrir,
        durabilidad_despues_abrir=rotulo.durabilidad_despues_abrir,
        condiciones_conservacion=rotulo.condiciones_conservacion,
        aplica_instrucciones_uso=rotulo.aplica_instrucciones_uso,
        instrucciones_uso=rotulo.instrucciones_uso,
    )

    advertencias = _construir_advertencias_preview(
        rotulo=rotulo,
        tabla_nutricional_incompleta=tabla_nutricional_incompleta,
        motivo_nutricion_incompleta=nutricion.motivo_incompleta,
    )

    return schemas.VistaPreviaRotuloOut(
        producto_id=rotulo.producto_id,
        producto_nombre=rotulo.producto_nombre,
        guardado_en_bd=rotulo.guardado_en_bd,
        tiene_receta_activa=auto.tiene_receta_activa,
        receta_codigo=auto.receta_codigo,
        receta_nombre=auto.receta_nombre,
        leyenda_borrador_obligatoria=LEYENDA_BORRADOR_ROTULO,
        cara_principal=cara_principal,
        lista_ingredientes_texto=rotulo.lista_ingredientes_texto,
        leyenda_alergenos_declarada=rotulo.leyenda_alergenos_declarada,
        estado_validacion_alergenos=rotulo.estado_validacion_alergenos,
        nutricion=nutricion,
        origen=origen,
        conservacion_lote=conservacion_lote,
        completitud_caa=rotulo.completitud_caa,
        tabla_nutricional_incompleta=tabla_nutricional_incompleta,
        advertencias=advertencias,
        fecha_generacion=datetime.now(),
    )


def _construir_anexo_receta(
    receta: Receta,
    unidad_rendimiento: str,
    version_parametro_frontal: Optional[str],
) -> schemas.AnexoRecetaActivaOut:
    """Construye el Anexo I: desglose de ingredientes y aditivos de la receta activa."""
    insumos_map = recetas_services._consolidar_insumos_receta(receta)
    ingredientes: list[schemas.InsumoAnexoRecetaOut] = []
    aditivos: list[schemas.InsumoAnexoRecetaOut] = []

    for data in insumos_map.values():
        insumo = data["insumo"]
        categoria_norm = (insumo.categoria or "").strip().lower()
        es_aditivo = categoria_norm == "aditivo"
        item = schemas.InsumoAnexoRecetaOut(
            insumo_id=insumo.id,
            nombre=insumo.nombre,
            denominacion_rotulo=getattr(insumo, "denominacion_rotulo", None),
            categoria=insumo.categoria,
            es_aditivo=es_aditivo,
            clase_funcional=getattr(insumo, "clase_funcional", None),
            numero_ins=getattr(insumo, "numero_ins", None),
            cantidad_nominal=round(float(data["cantidad_nominal"]), 4),
            unidad_simbolo=insumo.unidad_medida.simbolo if insumo.unidad_medida else "",
        )
        if es_aditivo:
            aditivos.append(item)
        else:
            ingredientes.append(item)

    ingredientes.sort(key=lambda it: it.nombre.lower())
    aditivos.sort(key=lambda it: it.nombre.lower())

    return schemas.AnexoRecetaActivaOut(
        receta_id=receta.id,
        codigo_receta=receta.codigo_receta,
        nombre_receta=receta.nombre_receta,
        estado_receta=receta.estado.value if hasattr(receta.estado, "value") else str(receta.estado),
        fecha_creacion=receta.fecha_creacion,
        rendimiento_estandar=float(receta.rendimiento_estandar),
        unidad_rendimiento=unidad_rendimiento or "g",
        tamano_porcion=float(receta.tamano_porcion) if receta.tamano_porcion is not None else None,
        version_parametro_frontal=version_parametro_frontal,
        ingredientes=ingredientes,
        aditivos=aditivos,
    )


def _construir_fuentes_nutricionales(
    receta: Receta,
) -> list[schemas.FuenteNutricionalInsumoOut]:
    """Construye el listado de fuentes de datos nutricionales por insumo para el Anexo III."""
    insumos_map = recetas_services._consolidar_insumos_receta(receta)
    fuentes: list[schemas.FuenteNutricionalInsumoOut] = []

    for data in insumos_map.values():
        insumo = data["insumo"]
        completa = bool(insumo.nutricion_completa)
        faltantes = (
            [] if completa else recetas_services._obtener_campos_faltantes_insumo(insumo)
        )
        fuentes.append(
            schemas.FuenteNutricionalInsumoOut(
                insumo_id=insumo.id,
                nombre=insumo.nombre,
                categoria=insumo.categoria,
                nutricion_completa=completa,
                fuente_nutricional=_normalizar_texto(
                    getattr(insumo, "fuente_nutricional", None)
                ),
                es_nutricion_modificada=bool(
                    getattr(insumo, "es_nutricion_modificada", False)
                ),
                fecha_carga_nutricional=getattr(insumo, "fecha_carga_nutricional", None),
                fecha_modificacion_nutricional=getattr(
                    insumo, "fecha_modificacion_nutricional", None
                ),
                campos_faltantes=faltantes,
            )
        )

    fuentes.sort(key=lambda f: f.nombre.lower())
    return fuentes


def obtener_respaldo_calculo_rotulo(
    db: Session,
    producto_id: int,
) -> schemas.RespaldoCalculoRotuloOut:
    """Consolida la vista previa del borrador junto con los Anexos I a IV de respaldo de cálculo."""
    producto = _obtener_producto(db, producto_id)
    vista_previa = obtener_vista_previa_rotulo(db, producto_id)

    receta_activa = db.scalar(
        select(Receta)
        .where(
            Receta.producto_id == producto.id,
            Receta.estado == EstadoReceta.ACTIVA,
        )
        .order_by(Receta.id.desc())
    )

    if receta_activa is None:
        return schemas.RespaldoCalculoRotuloOut(
            producto_id=producto.id,
            producto_nombre=producto.nombre,
            fecha_emision=datetime.now(),
            leyenda_borrador_obligatoria=LEYENDA_BORRADOR_ROTULO,
            codigo_receta_empleada=None,
            version_parametros_aplicada=None,
            tiene_receta_activa=False,
            vista_previa=vista_previa,
            anexo_receta=None,
            anexo_composicion=None,
            es_orden_ingredientes_manual=False,
            anexo_nutricion=None,
            anexo_memoria_sellos=None,
        )

    receta_completa = recetas_services.obtener_receta_por_id(db, receta_activa.id)
    composicion = recetas_services.obtener_composicion_porcentual(db, receta_activa.id)
    declaracion = recetas_services.obtener_declaracion_ingredientes(db, receta_activa.id)
    info_nutricional = recetas_services.obtener_informacion_nutricional(db, receta_activa.id)
    aplicabilidad = rotulado_services.evaluar_aplicabilidad_frontal(db, receta_activa.id)
    sellos = rotulado_services.calcular_sellos_advertencia(db, receta_activa.id)

    unidad_rendimiento = producto.unidad_medida.simbolo if producto.unidad_medida else "g"
    version_parametros = sellos.version_normativa or aplicabilidad.version_normativa

    anexo_receta = _construir_anexo_receta(
        receta=receta_completa,
        unidad_rendimiento=unidad_rendimiento,
        version_parametro_frontal=version_parametros,
    )
    fuentes_nutricionales = _construir_fuentes_nutricionales(receta_completa)

    return schemas.RespaldoCalculoRotuloOut(
        producto_id=producto.id,
        producto_nombre=producto.nombre,
        fecha_emision=datetime.now(),
        leyenda_borrador_obligatoria=LEYENDA_BORRADOR_ROTULO,
        codigo_receta_empleada=receta_completa.codigo_receta,
        version_parametros_aplicada=version_parametros,
        tiene_receta_activa=True,
        vista_previa=vista_previa,
        anexo_receta=anexo_receta,
        anexo_composicion=composicion,
        es_orden_ingredientes_manual=declaracion.es_orden_manual,
        anexo_nutricion=schemas.AnexoNutricionDetalladaOut(
            informacion_nutricional=info_nutricional,
            fuentes_datos_insumos=fuentes_nutricionales,
        ),
        anexo_memoria_sellos=schemas.AnexoMemoriaSellosOut(
            aplicabilidad=aplicabilidad,
            sellos=sellos,
        ),
    )
