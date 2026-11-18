import unicodedata

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session, joinedload

from src.configuracion.constants import (
    CategoriaAlimentoNormativa,
    EstadoVersionNormativa,
    NutrienteCritico,
)
from src.configuracion.models import (
    ConfiguracionModulo,
    ReglaUmbralFrontal,
    VersionParametroFrontal,
)
from src.configuracion.services import inicializar_parametros_frontales
from src.insumos.models import Insumo
from src.lotes.models import Lote
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import PasoInsumo, PasoReceta, Receta
from src.rotulado import exceptions, schemas
from src.rotulado.constants import (
    CodigoLeyendaPrecautoria,
    CodigoSelloAdvertencia,
    DictamenAplicabilidad,
    MensajesAplicabilidad,
    NormativaDefecto,
    TextosSellos,
    UmbralesEtapa2,
)
from src.rotulado.models import NormativaRotulado

CAMPOS_REGLAS_NORMATIVA = (
    "requiere_envasado_ausencia_cliente",
    "evalua_azucares_agregados",
    "evalua_grasas_agregadas",
    "evalua_sodio_agregado",
    "evalua_edulcorantes",
    "evalua_cafeina",
)

CAMPOS_OVERRIDES_RECETA = (
    "override_azucares_agregados",
    "override_grasas_agregadas",
    "override_sodio_agregado",
    "override_edulcorantes",
    "override_cafeina",
)

DESCRIPCION_NORMATIVA_DEFECTO = (
    "Parámetros iniciales de aplicabilidad según Ley 27.642 y Decreto Reglamentario 151/2022."
)


# ---------------------------------------------------------------------------
# Normativa versionada de rotulado frontal
# ---------------------------------------------------------------------------


def _normalizar_ascii(texto: str) -> str:
    return (
        unicodedata.normalize("NFKD", texto)
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def _valores_defecto_normativa(normalizar_ascii: bool = False) -> dict:
    nombre = NormativaDefecto.NOMBRE
    version = NormativaDefecto.VERSION
    descripcion = DESCRIPCION_NORMATIVA_DEFECTO
    if normalizar_ascii:
        nombre = _normalizar_ascii(nombre)
        version = _normalizar_ascii(version)
        descripcion = _normalizar_ascii(descripcion)

    return {
        "nombre": nombre,
        "version": version,
        "requiere_envasado_ausencia_cliente": NormativaDefecto.REQUIERE_ENVASADO,
        "evalua_azucares_agregados": NormativaDefecto.EVALUA_AZUCARES,
        "evalua_grasas_agregadas": NormativaDefecto.EVALUA_GRASAS,
        "evalua_sodio_agregado": NormativaDefecto.EVALUA_SODIO,
        "evalua_edulcorantes": NormativaDefecto.EVALUA_EDULCORANTES,
        "evalua_cafeina": NormativaDefecto.EVALUA_CAFEINA,
        "descripcion": descripcion,
    }


def _normativa_sin_cambios(actual: NormativaRotulado, datos: dict) -> bool:
    return (
        actual.nombre == datos["nombre"]
        and actual.version == datos["version"]
        and (actual.descripcion or None) == datos["descripcion"]
        and all(getattr(actual, campo) == datos[campo] for campo in CAMPOS_REGLAS_NORMATIVA)
    )


def _reasignar_recetas_a_normativa_vigente(db: Session, nueva_normativa_id: int) -> None:
    """Migra recetas en borrador o activas sin lotes a la nueva versión normativa vigente.

    Las recetas activas con lotes asociados y las inhabilitadas conservan su normativa histórica.
    """
    db.execute(
        update(Receta)
        .where(
            or_(
                Receta.estado == EstadoReceta.BORRADOR,
                (Receta.estado == EstadoReceta.ACTIVA) & (~Receta.lotes.any()),
            )
        )
        .values(normativa_rotulado_id=nueva_normativa_id)
    )


def _crear_nueva_version_normativa(
    db: Session,
    codigo_normativa: str,
    datos: dict,
) -> NormativaRotulado:
    """Desactiva la normativa vigente, crea una nueva instancia activa y migra recetas editables."""
    db.execute(
        update(NormativaRotulado)
        .where(NormativaRotulado.activa == True)
        .values(activa=False)
    )

    nueva = NormativaRotulado(
        codigo_normativa=codigo_normativa,
        activa=True,
        **datos,
    )
    db.add(nueva)
    db.flush()

    _reasignar_recetas_a_normativa_vigente(db, nueva.id)

    db.commit()
    db.refresh(nueva)
    return nueva


def inicializar_normativa_rotulado(
    db: Session, normalizar_ascii: bool = False
) -> NormativaRotulado:
    """Crea la normativa de rotulado frontal por defecto (Ley 27.642) si no existe ninguna."""
    normativa = db.scalar(
        select(NormativaRotulado)
        .where(NormativaRotulado.activa == True)
        .order_by(NormativaRotulado.id.desc())
    )
    if not normativa:
        normativa = db.scalar(select(NormativaRotulado).order_by(NormativaRotulado.id.desc()))
    if not normativa:
        normativa = NormativaRotulado(
            codigo_normativa=NormativaDefecto.CODIGO,
            activa=True,
            **_valores_defecto_normativa(normalizar_ascii=normalizar_ascii),
        )
        db.add(normativa)
        db.commit()
        db.refresh(normativa)
    return normativa


def obtener_normativa_activa(db: Session) -> NormativaRotulado:
    """Obtiene la versión activa de parámetros normativos o la inicializa."""
    normativa = db.scalar(
        select(NormativaRotulado)
        .where(NormativaRotulado.activa == True)
        .order_by(NormativaRotulado.id.desc())
    )
    if not normativa:
        normativa = inicializar_normativa_rotulado(db)
    return normativa


def actualizar_normativa_activa(
    db: Session, payload: schemas.NormativaRotuladoUpdateIn
) -> NormativaRotulado:
    """Crea una nueva versión activa de la normativa de rotulado frontal solo si hubo cambios."""
    anterior = obtener_normativa_activa(db)
    datos = {
        "nombre": payload.nombre.strip(),
        "version": payload.version.strip(),
        "descripcion": (
            payload.descripcion.strip()
            if payload.descripcion is not None and payload.descripcion.strip()
            else None
        ),
        **{campo: getattr(payload, campo) for campo in CAMPOS_REGLAS_NORMATIVA},
    }
    if _normativa_sin_cambios(anterior, datos):
        return anterior

    return _crear_nueva_version_normativa(db, anterior.codigo_normativa, datos)


def restaurar_normativa_defecto(db: Session) -> NormativaRotulado:
    """Crea una nueva versión activa con los valores por defecto de la Ley 27.642 si difieren de la actual."""
    anterior = obtener_normativa_activa(db)
    datos = _valores_defecto_normativa(normalizar_ascii=False)
    if _normativa_sin_cambios(anterior, datos):
        return anterior

    return _crear_nueva_version_normativa(db, NormativaDefecto.CODIGO, datos)


# ---------------------------------------------------------------------------
# Evaluación de aplicabilidad de rotulado frontal
# ---------------------------------------------------------------------------


def _receta_tiene_lotes(db: Session, receta_id: int) -> bool:
    return db.scalar(select(Lote.id).where(Lote.receta_id == receta_id).limit(1)) is not None


def _puede_editar_overrides(db: Session, receta: Receta) -> bool:
    if receta.estado == EstadoReceta.INHABILITADA:
        return False
    if receta.estado == EstadoReceta.ACTIVA and _receta_tiene_lotes(db, receta.id):
        return False
    return True


def _obtener_receta_con_relaciones(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(
        select(Receta)
        .options(
            joinedload(Receta.producto).joinedload(Producto.unidad_medida),
            joinedload(Receta.normativa_rotulado),
            joinedload(Receta.version_parametro_frontal).joinedload(
                VersionParametroFrontal.reglas
            ),
            joinedload(Receta.pasos)
            .joinedload(PasoReceta.insumos)
            .joinedload(PasoInsumo.insumo),
        )
        .where(Receta.id == receta_id)
    )
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    if not receta.producto:
        raise exceptions.ProductoSinReceta()
    return receta


def _detectar_agregados_automaticos(receta: Receta) -> dict[str, bool]:
    """Inspecciona los insumos y aditivos de la receta para detectar agregados y sustancias reguladas."""
    detectado = {
        "azucares": False,
        "grasas": False,
        "sodio": False,
        "edulcorantes": False,
        "cafeina": False,
    }

    for paso in receta.pasos or []:
        for pi in paso.insumos or []:
            insumo: Insumo | None = pi.insumo
            if not insumo or (insumo.categoria or "").strip().lower() == "envase":
                continue

            if getattr(insumo, "aporta_azucares_agregados", False):
                detectado["azucares"] = True
            if getattr(insumo, "aporta_grasas_agregadas", False):
                detectado["grasas"] = True
            if getattr(insumo, "aporta_sodio_agregado", False):
                detectado["sodio"] = True
            if getattr(insumo, "contiene_cafeina", False):
                detectado["cafeina"] = True

            clase_funcional = (insumo.clase_funcional or "").strip().lower()
            if getattr(insumo, "es_edulcorante", False) or "edulcorante" in clase_funcional:
                detectado["edulcorantes"] = True

    return detectado


def _resolver_valor_efectivo(
    regla_activa: bool, override: bool | None, calculado: bool
) -> bool:
    return bool(regla_activa and (override if override is not None else calculado))


def _obtener_version_parametro_para_receta(
    db: Session, receta: Receta
) -> VersionParametroFrontal:
    if receta.version_parametro_frontal is not None:
        return receta.version_parametro_frontal
    vigente = db.scalar(
        select(VersionParametroFrontal).where(
            VersionParametroFrontal.estado == EstadoVersionNormativa.VIGENTE
        )
    )
    if vigente is not None:
        return vigente
    return inicializar_parametros_frontales(db)


def _obtener_estado_modulo_octogonos(db: Session) -> tuple[bool, str | None]:
    modulo = db.get(ConfiguracionModulo, 1)
    if modulo is not None and not modulo.octogonos_activos:
        return False, modulo.observacion
    return True, None


def _buscar_regla_umbral(
    version_param: VersionParametroFrontal,
    nutriente_critico: str,
    categoria: str,
) -> ReglaUmbralFrontal | None:
    for regla in version_param.reglas or []:
        if (
            regla.nutriente_critico == nutriente_critico
            and (regla.categoria or "").upper() == categoria.upper()
        ):
            return regla
    return None


def _evaluar_aplicabilidad_sobre_receta(
    db: Session, receta: Receta
) -> schemas.AplicabilidadFrontalOut:
    """Evalúa la aplicabilidad de rotulado frontal usando una instancia de Receta ya cargada."""
    producto: Producto = receta.producto
    normativa = receta.normativa_rotulado or obtener_normativa_activa(db)
    version_param = _obtener_version_parametro_para_receta(db, receta)
    modulo_activo, obs_modulo = _obtener_estado_modulo_octogonos(db)
    auto = _detectar_agregados_automaticos(receta)

    tiene_azucares = _resolver_valor_efectivo(
        normativa.evalua_azucares_agregados,
        receta.override_azucares_agregados,
        auto["azucares"],
    )
    tiene_grasas = _resolver_valor_efectivo(
        normativa.evalua_grasas_agregadas,
        receta.override_grasas_agregadas,
        auto["grasas"],
    )
    tiene_sodio = _resolver_valor_efectivo(
        normativa.evalua_sodio_agregado,
        receta.override_sodio_agregado,
        auto["sodio"],
    )
    contiene_edulcorantes = _resolver_valor_efectivo(
        normativa.evalua_edulcorantes,
        receta.override_edulcorantes,
        auto["edulcorantes"],
    )
    contiene_cafeina = _resolver_valor_efectivo(
        normativa.evalua_cafeina,
        receta.override_cafeina,
        auto["cafeina"],
    )

    envasado_ausencia_cliente = bool(producto.envasado_ausencia_cliente)

    if not modulo_activo:
        dictamen = DictamenAplicabilidad.NO_APLICA
        aplica_rotulado = False
        dictamen_titulo = "No corresponde rotulado frontal (Módulo desactivado)"
        motivo = (
            "La evaluación de rotulado frontal se encuentra desactivada en Configuración del Sistema."
            + (f" Motivo: {obs_modulo}" if obs_modulo else "")
        )
    elif normativa.requiere_envasado_ausencia_cliente and not envasado_ausencia_cliente:
        dictamen = DictamenAplicabilidad.NO_APLICA
        aplica_rotulado = False
        dictamen_titulo = MensajesAplicabilidad.NO_APLICA_TITULO
        motivo = MensajesAplicabilidad.NO_APLICA_MOTIVO
    elif (
        tiene_azucares
        or tiene_grasas
        or tiene_sodio
        or contiene_edulcorantes
        or contiene_cafeina
    ):
        dictamen = DictamenAplicabilidad.APLICA
        aplica_rotulado = True
        dictamen_titulo = MensajesAplicabilidad.APLICA_TITULO
        motivo = MensajesAplicabilidad.APLICA_MOTIVO
    else:
        dictamen = DictamenAplicabilidad.EXCEPTUADO
        aplica_rotulado = False
        dictamen_titulo = MensajesAplicabilidad.EXCEPTUADO_TITULO
        motivo = MensajesAplicabilidad.EXCEPTUADO_MOTIVO

    version_etiqueta = (
        f"Versión #{version_param.numero_version} — {version_param.normativa_referencia}"
        if receta.normativa_rotulado is None
        else f"{normativa.nombre} ({normativa.version})"
    )

    return schemas.AplicabilidadFrontalOut(
        receta_id=receta.id,
        codigo_receta=receta.codigo_receta,
        producto_id=producto.id,
        producto_nombre=producto.nombre,
        envasado_ausencia_cliente=envasado_ausencia_cliente,
        calculado_azucares_agregados=auto["azucares"],
        calculado_grasas_agregadas=auto["grasas"],
        calculado_sodio_agregado=auto["sodio"],
        calculado_edulcorantes=auto["edulcorantes"],
        calculado_cafeina=auto["cafeina"],
        override_azucares_agregados=receta.override_azucares_agregados,
        override_grasas_agregadas=receta.override_grasas_agregadas,
        override_sodio_agregado=receta.override_sodio_agregado,
        override_edulcorantes=receta.override_edulcorantes,
        override_cafeina=receta.override_cafeina,
        es_aplicabilidad_forzada_manualmente=bool(receta.es_aplicabilidad_forzada_manualmente),
        tiene_azucares_agregados=tiene_azucares,
        tiene_grasas_agregadas=tiene_grasas,
        tiene_sodio_agregado=tiene_sodio,
        contiene_edulcorantes=contiene_edulcorantes,
        contiene_cafeina=contiene_cafeina,
        aplica_rotulado_frontal=aplica_rotulado,
        dictamen=dictamen,
        dictamen_titulo=dictamen_titulo,
        motivo=motivo,
        version_normativa=version_etiqueta,
        puede_editar_overrides=modulo_activo and _puede_editar_overrides(db, receta),
        modulo_octogonos_activo=modulo_activo,
    )


def evaluar_aplicabilidad_frontal(db: Session, receta_id: int) -> schemas.AplicabilidadFrontalOut:
    """Evalúa la aplicabilidad de la normativa de rotulado frontal para una receta."""
    receta = _obtener_receta_con_relaciones(db, receta_id)
    return _evaluar_aplicabilidad_sobre_receta(db, receta)


def actualizar_overrides_aplicabilidad(
    db: Session, receta_id: int, payload: schemas.AplicabilidadFrontalIn
) -> schemas.AplicabilidadFrontalOut:
    """Actualiza o restablece los overrides manuales de aplicabilidad de rotulado frontal en una receta."""
    receta = _obtener_receta_con_relaciones(db, receta_id)

    if receta.estado == EstadoReceta.INHABILITADA:
        raise exceptions.RecetaInhabilitadaNoEditableAplicabilidad()
    if receta.estado == EstadoReceta.ACTIVA and _receta_tiene_lotes(db, receta.id):
        raise exceptions.RecetaConLotesNoEditableAplicabilidad()

    if payload.restablecer_automatico:
        for campo in CAMPOS_OVERRIDES_RECETA:
            setattr(receta, campo, None)
        receta.es_aplicabilidad_forzada_manualmente = False
    else:
        for campo in CAMPOS_OVERRIDES_RECETA:
            if campo in payload.model_fields_set:
                setattr(receta, campo, getattr(payload, campo))

        receta.es_aplicabilidad_forzada_manualmente = any(
            getattr(receta, campo) is not None for campo in CAMPOS_OVERRIDES_RECETA
        )

    db.commit()
    db.refresh(receta)
    return _evaluar_aplicabilidad_sobre_receta(db, receta)


# ---------------------------------------------------------------------------
# Cálculo de sellos de advertencia y leyendas precautorias (Ley 27.642)
# ---------------------------------------------------------------------------


def _paso_omitido(
    *,
    codigo: str,
    etiqueta: str,
    motivo: str,
    valor_tabla_100: float,
    unidad_tabla: str,
    formula_aplicada: str,
    unidad_obtenida: str,
    umbral_normativo: str,
) -> tuple[schemas.PasoMemoriaCalculoOut, None]:
    return (
        schemas.PasoMemoriaCalculoOut(
            codigo=codigo,
            nutriente_etiqueta=etiqueta,
            se_evalua=False,
            motivo_evaluacion=motivo,
            valor_tabla_100=round(valor_tabla_100, 2),
            unidad_tabla=unidad_tabla,
            formula_aplicada=formula_aplicada,
            calculo_sustituido=None,
            valor_obtenido=None,
            unidad_obtenida=unidad_obtenida,
            umbral_normativo=umbral_normativo,
            supera_umbral=False,
            sello_resultante=None,
        ),
        None,
    )


def _evaluar_proporcion_energetica(
    *,
    codigo: str,
    etiqueta: str,
    se_evalua: bool,
    motivo_si: str,
    motivo_no: str,
    gramos: float,
    factor_kcal: float,
    kcal_totales: float,
    umbral_pct: float,
    codigo_sello: CodigoSelloAdvertencia,
) -> tuple[schemas.PasoMemoriaCalculoOut, schemas.SelloAdvertenciaOut | None]:
    """Evalúa un macronutriente crítico respecto del porcentaje de calorías totales."""
    umbral_str = f"≥ {umbral_pct:g}% de las kcal totales"
    formula = f"gramos × {int(factor_kcal)} kcal/g × 100 ÷ kcal totales"
    texto_sello = TextosSellos.SELLOS[codigo_sello]

    if not se_evalua:
        return _paso_omitido(
            codigo=codigo,
            etiqueta=etiqueta,
            motivo=motivo_no,
            valor_tabla_100=gramos,
            unidad_tabla="g",
            formula_aplicada=formula,
            unidad_obtenida="%",
            umbral_normativo=umbral_str,
        )

    if kcal_totales <= 0:
        if gramos <= 0:
            pct = 0.0
            calculo_str = (
                f"0,00 g × {int(factor_kcal)} × 100 ÷ 0,00 kcal = 0,00% (producto acalórico)"
            )
        else:
            pct = 100.0
            calculo_str = (
                f"{gramos:.2f} g × {int(factor_kcal)} kcal/g con 0,00 kcal totales declaradas → "
                "100,00% (guarda división por cero)"
            )
    else:
        pct = min(100.0, round((gramos * factor_kcal * 100.0) / kcal_totales, 2))
        calculo_str = (
            f"{gramos:.2f} g × {int(factor_kcal)} × 100 ÷ {kcal_totales:.2f} kcal = {pct:.2f}%"
        )

    supera = pct >= umbral_pct
    sello = (
        schemas.SelloAdvertenciaOut(codigo=codigo_sello.value, texto=texto_sello)
        if supera
        else None
    )
    return (
        schemas.PasoMemoriaCalculoOut(
            codigo=codigo,
            nutriente_etiqueta=etiqueta,
            se_evalua=True,
            motivo_evaluacion=motivo_si,
            valor_tabla_100=round(gramos, 2),
            unidad_tabla="g",
            formula_aplicada=formula,
            calculo_sustituido=calculo_str,
            valor_obtenido=pct,
            unidad_obtenida="%",
            umbral_normativo=umbral_str,
            supera_umbral=supera,
            sello_resultante=texto_sello if supera else None,
        ),
        sello,
    )


def _evaluar_sodio(
    *,
    se_evalua: bool,
    sodio_mg: float,
    kcal_totales: float,
    umbral_mg_kcal: float,
    umbral_abs_mg: float,
    base_calculo: str,
) -> tuple[schemas.PasoMemoriaCalculoOut, schemas.SelloAdvertenciaOut | None]:
    """Evalúa la doble regla de sodio (relación mg/kcal y umbral absoluto por 100 g/ml)."""
    umbral_str = f"≥ {umbral_mg_kcal:g} mg/kcal ó ≥ {umbral_abs_mg:g} mg / {base_calculo}"
    formula = f"mg sodio ÷ kcal totales  |  mg sodio cada {base_calculo}"
    texto_sello = TextosSellos.SELLOS[CodigoSelloAdvertencia.EXCESO_SODIO]

    if not se_evalua:
        return _paso_omitido(
            codigo="sodio",
            etiqueta="Sodio",
            motivo="No se evalúa: el producto no contiene sodio agregado.",
            valor_tabla_100=sodio_mg,
            unidad_tabla="mg",
            formula_aplicada=formula,
            unidad_obtenida="mg",
            umbral_normativo=umbral_str,
        )

    supera_abs = sodio_mg >= umbral_abs_mg
    if kcal_totales <= 0:
        supera_ratio = False
        calculo_str = (
            f"Relación: N/A (0,00 kcal, guarda división por cero)  |  "
            f"Absoluto: {sodio_mg:.2f} mg / {base_calculo}"
        )
        valor_obtenido = round(sodio_mg, 2)
        unidad_obtenida = f"mg / {base_calculo}"
    else:
        ratio = round(sodio_mg / kcal_totales, 2)
        supera_ratio = ratio >= umbral_mg_kcal
        calculo_str = (
            f"Relación: {sodio_mg:.2f} mg ÷ {kcal_totales:.2f} kcal = {ratio:.2f} mg/kcal  |  "
            f"Absoluto: {sodio_mg:.2f} mg / {base_calculo}"
        )
        if supera_ratio and not supera_abs:
            valor_obtenido = ratio
            unidad_obtenida = "mg/kcal"
        else:
            valor_obtenido = round(sodio_mg, 2)
            unidad_obtenida = f"mg / {base_calculo}"

    supera = supera_ratio or supera_abs
    sello = (
        schemas.SelloAdvertenciaOut(
            codigo=CodigoSelloAdvertencia.EXCESO_SODIO.value, texto=texto_sello
        )
        if supera
        else None
    )
    return (
        schemas.PasoMemoriaCalculoOut(
            codigo="sodio",
            nutriente_etiqueta="Sodio",
            se_evalua=True,
            motivo_evaluacion="Se evalúa porque la receta registra sodio agregado.",
            valor_tabla_100=round(sodio_mg, 2),
            unidad_tabla="mg",
            formula_aplicada=formula,
            calculo_sustituido=calculo_str,
            valor_obtenido=valor_obtenido,
            unidad_obtenida=unidad_obtenida,
            umbral_normativo=umbral_str,
            supera_umbral=supera,
            sello_resultante=texto_sello if supera else None,
        ),
        sello,
    )


def _evaluar_calorias(
    *,
    tiene_azucares_agregados: bool,
    tiene_grasas_agregadas: bool,
    kcal_totales: float,
    umbral_kcal: float,
    base_calculo: str,
) -> tuple[schemas.PasoMemoriaCalculoOut, schemas.SelloAdvertenciaOut | None]:
    """Evalúa el sello de calorías (regla estricta: solo con azúcares o grasas agregadas)."""
    se_evalua = tiene_azucares_agregados or tiene_grasas_agregadas
    umbral_str = f"≥ {umbral_kcal:g} kcal / {base_calculo}"
    formula = f"Valor energético cada {base_calculo}"
    texto_sello = TextosSellos.SELLOS[CodigoSelloAdvertencia.EXCESO_CALORIAS]

    if not se_evalua:
        return _paso_omitido(
            codigo="calorias",
            etiqueta="Calorías (Valor energético)",
            motivo="No se evalúa: no tiene agregado de azúcares ni de grasas (regla estricta).",
            valor_tabla_100=kcal_totales,
            unidad_tabla="kcal",
            formula_aplicada=formula,
            unidad_obtenida="kcal",
            umbral_normativo=umbral_str,
        )

    supera = se_evalua and (kcal_totales >= umbral_kcal)
    sello = (
        schemas.SelloAdvertenciaOut(
            codigo=CodigoSelloAdvertencia.EXCESO_CALORIAS.value, texto=texto_sello
        )
        if supera
        else None
    )
    return (
        schemas.PasoMemoriaCalculoOut(
            codigo="calorias",
            nutriente_etiqueta="Calorías (Valor energético)",
            se_evalua=True,
            motivo_evaluacion="Se evalúa porque la receta registra agregado de azúcares y/o grasas.",
            valor_tabla_100=round(kcal_totales, 2),
            unidad_tabla="kcal",
            formula_aplicada=formula,
            calculo_sustituido=(
                f"{kcal_totales:.2f} kcal / {base_calculo} "
                f"({'≥' if supera else '<'} {umbral_kcal:g} kcal)"
            ),
            valor_obtenido=round(kcal_totales, 2),
            unidad_obtenida="kcal",
            umbral_normativo=umbral_str,
            supera_umbral=supera,
            sello_resultante=texto_sello if supera else None,
        ),
        sello,
    )


def calcular_sellos_advertencia(db: Session, receta_id: int) -> schemas.SellosAdvertenciaOut:
    """Calcula los octógonos negros, leyendas precautorias y memoria de cálculo (Ley 27.642 - Etapa 2)."""
    from src.recetas.services import obtener_informacion_nutricional

    receta = _obtener_receta_con_relaciones(db, receta_id)
    producto: Producto = receta.producto
    normativa = receta.normativa_rotulado or obtener_normativa_activa(db)
    version_param = _obtener_version_parametro_para_receta(db, receta)
    aplicabilidad = _evaluar_aplicabilidad_sobre_receta(db, receta)

    es_liquido = producto.es_liquido
    base_calculo = "100 ml" if es_liquido else "100 g"
    categoria_normativa = (
        CategoriaAlimentoNormativa.BEBIDA
        if es_liquido
        else CategoriaAlimentoNormativa.ALIMENTO
    )
    base_out = {
        "receta_id": receta.id,
        "codigo_receta": receta.codigo_receta,
        "producto_id": producto.id,
        "producto_nombre": producto.nombre,
        "es_liquido": es_liquido,
        "base_calculo": base_calculo,
        "dictamen_aplicabilidad": aplicabilidad.dictamen,
        "version_normativa": f"Versión #{version_param.numero_version} — {version_param.normativa_referencia}",
        "fecha_vigencia_normativa": version_param.fecha_vigencia_desde,
    }

    if aplicabilidad.dictamen != DictamenAplicabilidad.APLICA:
        return schemas.SellosAdvertenciaOut(
            **base_out,
            aplica_evaluacion_sellos=False,
            es_calculable=False,
            mensaje_bloqueo=aplicabilidad.motivo,
        )

    info_nutricional = obtener_informacion_nutricional(db, receta_id)
    if not info_nutricional.es_calculable:
        return schemas.SellosAdvertenciaOut(
            **base_out,
            aplica_evaluacion_sellos=True,
            es_calculable=False,
            mensaje_bloqueo=(
                "No se pueden calcular los sellos porque la tabla nutricional aún tiene "
                "insumos con datos pendientes o sin equivalencia a gramos."
            ),
        )

    valores_100 = {
        fila.codigo_nutriente: float(fila.valor_100g or 0.0)
        for fila in info_nutricional.filas
    }
    azucares_anadidos = valores_100.get("azucares_anadidos", 0.0)
    azucares_totales = valores_100.get("azucares_totales", 0.0)
    azucares_g = (
        azucares_anadidos
        if azucares_anadidos > 0 or not aplicabilidad.tiene_azucares_agregados
        else azucares_totales
    )
    carbohidratos_g = valores_100.get("carbohidratos", 0.0)
    proteinas_g = valores_100.get("proteinas", 0.0)
    grasas_totales_g = valores_100.get("grasas_totales", 0.0)
    grasas_saturadas_g = valores_100.get("grasas_saturadas", 0.0)
    sodio_mg = valores_100.get("sodio", 0.0)

    # Energía consolidada: toma el valor energético de la tabla y garantiza consistencia física
    # frente a los macronutrientes (Atwater 4/4/9) para evitar porcentajes > 100%.
    kcal_tabla = valores_100.get("valor_energetico", 0.0)
    kcal_atwater = (
        (carbohidratos_g * UmbralesEtapa2.FACTOR_KCAL_AZUCARES)
        + (proteinas_g * UmbralesEtapa2.FACTOR_KCAL_AZUCARES)
        + (grasas_totales_g * UmbralesEtapa2.FACTOR_KCAL_GRASAS)
    )
    kcal_azucares_min = azucares_g * UmbralesEtapa2.FACTOR_KCAL_AZUCARES
    kcal_totales = max(kcal_tabla, kcal_atwater, kcal_azucares_min)

    regla_azucares = _buscar_regla_umbral(
        version_param, NutrienteCritico.AZUCARES_ANADIDOS, categoria_normativa
    )
    regla_grasas_tot = _buscar_regla_umbral(
        version_param, NutrienteCritico.GRASAS_TOTALES, categoria_normativa
    )
    regla_grasas_sat = _buscar_regla_umbral(
        version_param, NutrienteCritico.GRASAS_SATURADAS, categoria_normativa
    )
    regla_sodio = _buscar_regla_umbral(
        version_param, NutrienteCritico.SODIO, categoria_normativa
    )
    regla_calorias = _buscar_regla_umbral(
        version_param, NutrienteCritico.CALORIAS, categoria_normativa
    )

    umbral_azucares = (
        float(regla_azucares.valor_umbral)
        if regla_azucares
        else float(normativa.umbral_pct_azucares)
    )
    umbral_grasas_tot = (
        float(regla_grasas_tot.valor_umbral)
        if regla_grasas_tot
        else float(normativa.umbral_pct_grasas_totales)
    )
    umbral_grasas_sat = (
        float(regla_grasas_sat.valor_umbral)
        if regla_grasas_sat
        else float(normativa.umbral_pct_grasas_saturadas)
    )
    umbral_sodio_abs = (
        float(regla_sodio.valor_umbral)
        if regla_sodio
        else float(
            normativa.umbral_sodio_liquido_mg
            if es_liquido
            else normativa.umbral_sodio_solido_mg
        )
    )
    umbral_calorias = (
        float(regla_calorias.valor_umbral)
        if regla_calorias
        else float(
            normativa.umbral_calorias_liquido_kcal
            if es_liquido
            else normativa.umbral_calorias_solido_kcal
        )
    )

    evaluaciones = [
        _evaluar_proporcion_energetica(
            codigo="azucares",
            etiqueta="Azúcares añadidos / agregados",
            se_evalua=aplicabilidad.tiene_azucares_agregados,
            motivo_si="Se evalúa porque la receta registra azúcares agregados.",
            motivo_no="No se evalúa: el producto no contiene azúcares agregados.",
            gramos=azucares_g,
            factor_kcal=UmbralesEtapa2.FACTOR_KCAL_AZUCARES,
            kcal_totales=kcal_totales,
            umbral_pct=umbral_azucares,
            codigo_sello=CodigoSelloAdvertencia.EXCESO_AZUCARES,
        ),
        _evaluar_proporcion_energetica(
            codigo="grasas_totales",
            etiqueta="Grasas totales",
            se_evalua=aplicabilidad.tiene_grasas_agregadas,
            motivo_si="Se evalúa porque la receta registra grasas agregadas.",
            motivo_no="No se evalúa: el producto no contiene grasas agregadas.",
            gramos=grasas_totales_g,
            factor_kcal=UmbralesEtapa2.FACTOR_KCAL_GRASAS,
            kcal_totales=kcal_totales,
            umbral_pct=umbral_grasas_tot,
            codigo_sello=CodigoSelloAdvertencia.EXCESO_GRASAS_TOTALES,
        ),
        _evaluar_proporcion_energetica(
            codigo="grasas_saturadas",
            etiqueta="Grasas saturadas",
            se_evalua=aplicabilidad.tiene_grasas_agregadas,
            motivo_si="Se evalúa porque la receta registra grasas agregadas.",
            motivo_no="No se evalúa: el producto no contiene grasas agregadas.",
            gramos=grasas_saturadas_g,
            factor_kcal=UmbralesEtapa2.FACTOR_KCAL_GRASAS,
            kcal_totales=kcal_totales,
            umbral_pct=umbral_grasas_sat,
            codigo_sello=CodigoSelloAdvertencia.EXCESO_GRASAS_SATURADAS,
        ),
        _evaluar_sodio(
            se_evalua=aplicabilidad.tiene_sodio_agregado,
            sodio_mg=sodio_mg,
            kcal_totales=kcal_totales,
            umbral_mg_kcal=float(normativa.umbral_sodio_mg_kcal),
            umbral_abs_mg=umbral_sodio_abs,
            base_calculo=base_calculo,
        ),
        _evaluar_calorias(
            tiene_azucares_agregados=aplicabilidad.tiene_azucares_agregados,
            tiene_grasas_agregadas=aplicabilidad.tiene_grasas_agregadas,
            kcal_totales=kcal_totales,
            umbral_kcal=umbral_calorias,
            base_calculo=base_calculo,
        ),
    ]

    sellos: list[schemas.SelloAdvertenciaOut] = []
    memoria: list[schemas.PasoMemoriaCalculoOut] = []
    for paso, sello in evaluaciones:
        memoria.append(paso)
        if sello is not None:
            sellos.append(sello)

    leyendas: list[schemas.LeyendaPrecautoriaOut] = []
    if aplicabilidad.contiene_edulcorantes:
        leyendas.append(
            schemas.LeyendaPrecautoriaOut(
                codigo=CodigoLeyendaPrecautoria.CONTIENE_EDULCORANTES.value,
                texto=TextosSellos.LEYENDAS[CodigoLeyendaPrecautoria.CONTIENE_EDULCORANTES],
            )
        )
    if aplicabilidad.contiene_cafeina:
        leyendas.append(
            schemas.LeyendaPrecautoriaOut(
                codigo=CodigoLeyendaPrecautoria.CONTIENE_CAFEINA.value,
                texto=TextosSellos.LEYENDAS[CodigoLeyendaPrecautoria.CONTIENE_CAFEINA],
            )
        )

    return schemas.SellosAdvertenciaOut(
        **base_out,
        aplica_evaluacion_sellos=True,
        es_calculable=True,
        valor_energetico_100=round(kcal_totales, 2),
        sellos=sellos,
        leyendas_precautorias=leyendas,
        memoria_calculo=memoria,
    )
