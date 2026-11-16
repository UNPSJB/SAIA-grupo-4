import unicodedata

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session, joinedload

from src.insumos.models import Insumo
from src.lotes.models import Lote
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta, PasoReceta, PasoInsumo
from src.rotulado import exceptions, schemas
from src.rotulado.constants import (
    DictamenAplicabilidad,
    MensajesAplicabilidad,
    NormativaDefecto,
)
from src.rotulado.models import NormativaRotulado


def _normalizar_ascii(texto: str) -> str:
    return (
        unicodedata.normalize("NFKD", texto)
        .encode("ascii", "ignore")
        .decode("ascii")
    )


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
        descripcion = (
            "Parámetros iniciales de aplicabilidad según Ley 27.642 y Decreto Reglamentario 151/2022."
        )
        normativa = NormativaRotulado(
            codigo_normativa=NormativaDefecto.CODIGO,
            nombre=_normalizar_ascii(NormativaDefecto.NOMBRE) if normalizar_ascii else NormativaDefecto.NOMBRE,
            version=_normalizar_ascii(NormativaDefecto.VERSION) if normalizar_ascii else NormativaDefecto.VERSION,
            activa=True,
            requiere_envasado_ausencia_cliente=NormativaDefecto.REQUIERE_ENVASADO,
            evalua_azucares_agregados=NormativaDefecto.EVALUA_AZUCARES,
            evalua_grasas_agregadas=NormativaDefecto.EVALUA_GRASAS,
            evalua_sodio_agregado=NormativaDefecto.EVALUA_SODIO,
            evalua_edulcorantes=NormativaDefecto.EVALUA_EDULCORANTES,
            evalua_cafeina=NormativaDefecto.EVALUA_CAFEINA,
            descripcion=_normalizar_ascii(descripcion) if normalizar_ascii else descripcion,
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
    *,
    codigo_normativa: str,
    nombre: str,
    version: str,
    requiere_envasado_ausencia_cliente: bool,
    evalua_azucares_agregados: bool,
    evalua_grasas_agregadas: bool,
    evalua_sodio_agregado: bool,
    evalua_edulcorantes: bool,
    evalua_cafeina: bool,
    descripcion: str | None,
) -> NormativaRotulado:
    """Desactiva la normativa vigente, crea una nueva instancia activa y migra recetas editables."""
    db.execute(
        update(NormativaRotulado)
        .where(NormativaRotulado.activa == True)
        .values(activa=False)
    )

    nueva = NormativaRotulado(
        codigo_normativa=codigo_normativa,
        nombre=nombre,
        version=version,
        activa=True,
        requiere_envasado_ausencia_cliente=requiere_envasado_ausencia_cliente,
        evalua_azucares_agregados=evalua_azucares_agregados,
        evalua_grasas_agregadas=evalua_grasas_agregadas,
        evalua_sodio_agregado=evalua_sodio_agregado,
        evalua_edulcorantes=evalua_edulcorantes,
        evalua_cafeina=evalua_cafeina,
        descripcion=descripcion,
    )
    db.add(nueva)
    db.flush()

    _reasignar_recetas_a_normativa_vigente(db, nueva.id)

    db.commit()
    db.refresh(nueva)
    return nueva


def _normativa_sin_cambios(
    actual: NormativaRotulado,
    *,
    nombre: str,
    version: str,
    requiere_envasado_ausencia_cliente: bool,
    evalua_azucares_agregados: bool,
    evalua_grasas_agregadas: bool,
    evalua_sodio_agregado: bool,
    evalua_edulcorantes: bool,
    evalua_cafeina: bool,
    descripcion: str | None,
) -> bool:
    return (
        actual.nombre == nombre
        and actual.version == version
        and actual.requiere_envasado_ausencia_cliente == requiere_envasado_ausencia_cliente
        and actual.evalua_azucares_agregados == evalua_azucares_agregados
        and actual.evalua_grasas_agregadas == evalua_grasas_agregadas
        and actual.evalua_sodio_agregado == evalua_sodio_agregado
        and actual.evalua_edulcorantes == evalua_edulcorantes
        and actual.evalua_cafeina == evalua_cafeina
        and (actual.descripcion or None) == descripcion
    )


def actualizar_normativa_activa(
    db: Session, payload: schemas.NormativaRotuladoUpdateIn
) -> NormativaRotulado:
    """Crea una nueva versión activa de la normativa de rotulado frontal solo si hubo cambios."""
    anterior = obtener_normativa_activa(db)
    nombre = payload.nombre.strip()
    version = payload.version.strip()
    descripcion = (
        payload.descripcion.strip()
        if payload.descripcion is not None and payload.descripcion.strip()
        else None
    )

    if _normativa_sin_cambios(
        anterior,
        nombre=nombre,
        version=version,
        requiere_envasado_ausencia_cliente=payload.requiere_envasado_ausencia_cliente,
        evalua_azucares_agregados=payload.evalua_azucares_agregados,
        evalua_grasas_agregadas=payload.evalua_grasas_agregadas,
        evalua_sodio_agregado=payload.evalua_sodio_agregado,
        evalua_edulcorantes=payload.evalua_edulcorantes,
        evalua_cafeina=payload.evalua_cafeina,
        descripcion=descripcion,
    ):
        return anterior

    return _crear_nueva_version_normativa(
        db,
        codigo_normativa=anterior.codigo_normativa,
        nombre=nombre,
        version=version,
        requiere_envasado_ausencia_cliente=payload.requiere_envasado_ausencia_cliente,
        evalua_azucares_agregados=payload.evalua_azucares_agregados,
        evalua_grasas_agregadas=payload.evalua_grasas_agregadas,
        evalua_sodio_agregado=payload.evalua_sodio_agregado,
        evalua_edulcorantes=payload.evalua_edulcorantes,
        evalua_cafeina=payload.evalua_cafeina,
        descripcion=descripcion,
    )


def restaurar_normativa_defecto(db: Session) -> NormativaRotulado:
    """Crea una nueva versión activa con los valores por defecto de la Ley 27.642 si difieren de la actual."""
    anterior = obtener_normativa_activa(db)
    descripcion_defecto = (
        "Parámetros iniciales de aplicabilidad según Ley 27.642 y Decreto Reglamentario 151/2022."
    )
    if _normativa_sin_cambios(
        anterior,
        nombre=NormativaDefecto.NOMBRE,
        version=NormativaDefecto.VERSION,
        requiere_envasado_ausencia_cliente=NormativaDefecto.REQUIERE_ENVASADO,
        evalua_azucares_agregados=NormativaDefecto.EVALUA_AZUCARES,
        evalua_grasas_agregadas=NormativaDefecto.EVALUA_GRASAS,
        evalua_sodio_agregado=NormativaDefecto.EVALUA_SODIO,
        evalua_edulcorantes=NormativaDefecto.EVALUA_EDULCORANTES,
        evalua_cafeina=NormativaDefecto.EVALUA_CAFEINA,
        descripcion=descripcion_defecto,
    ):
        return anterior

    return _crear_nueva_version_normativa(
        db,
        codigo_normativa=NormativaDefecto.CODIGO,
        nombre=NormativaDefecto.NOMBRE,
        version=NormativaDefecto.VERSION,
        requiere_envasado_ausencia_cliente=NormativaDefecto.REQUIERE_ENVASADO,
        evalua_azucares_agregados=NormativaDefecto.EVALUA_AZUCARES,
        evalua_grasas_agregadas=NormativaDefecto.EVALUA_GRASAS,
        evalua_sodio_agregado=NormativaDefecto.EVALUA_SODIO,
        evalua_edulcorantes=NormativaDefecto.EVALUA_EDULCORANTES,
        evalua_cafeina=NormativaDefecto.EVALUA_CAFEINA,
        descripcion=descripcion_defecto,
    )


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
            joinedload(Receta.producto),
            joinedload(Receta.normativa_rotulado),
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
    calc_azucares = False
    calc_grasas = False
    calc_sodio = False
    calc_edulcorantes = False
    calc_cafeina = False

    for paso in receta.pasos or []:
        for pi in paso.insumos or []:
            insumo: Insumo | None = pi.insumo
            if not insumo:
                continue

            # Omitir envases
            cat = (insumo.categoria or "").strip().lower()
            if cat == "envase":
                continue

            # Marcas de agregados en Insumo
            if getattr(insumo, "aporta_azucares_agregados", False):
                calc_azucares = True
            if getattr(insumo, "aporta_grasas_agregadas", False):
                calc_grasas = True
            if getattr(insumo, "aporta_sodio_agregado", False):
                calc_sodio = True
            if getattr(insumo, "contiene_cafeina", False):
                calc_cafeina = True

            # Detección de edulcorantes: por flag explícito o por clase funcional
            clase_funcional = (insumo.clase_funcional or "").strip().lower()
            if getattr(insumo, "es_edulcorante", False) or "edulcorante" in clase_funcional:
                calc_edulcorantes = True

    return {
        "azucares": calc_azucares,
        "grasas": calc_grasas,
        "sodio": calc_sodio,
        "edulcorantes": calc_edulcorantes,
        "cafeina": calc_cafeina,
    }


def evaluar_aplicabilidad_frontal(db: Session, receta_id: int) -> schemas.AplicabilidadFrontalOut:
    """Evalúa la aplicabilidad de la normativa de rotulado frontal para una receta."""
    receta = _obtener_receta_con_relaciones(db, receta_id)
    producto: Producto = receta.producto
    normativa = receta.normativa_rotulado or obtener_normativa_activa(db)

    # 1. Detección automática desde insumos y aditivos
    automatico = _detectar_agregados_automaticos(receta)
    calc_azucares = automatico["azucares"]
    calc_grasas = automatico["grasas"]
    calc_sodio = automatico["sodio"]
    calc_edulcorantes = automatico["edulcorantes"]
    calc_cafeina = automatico["cafeina"]

    # 2. Combinación con overrides manuales guardados en Receta y reglas activas de la normativa
    tiene_azucares = bool(
        normativa.evalua_azucares_agregados
        and (
            receta.override_azucares_agregados
            if receta.override_azucares_agregados is not None
            else calc_azucares
        )
    )
    tiene_grasas = bool(
        normativa.evalua_grasas_agregadas
        and (
            receta.override_grasas_agregadas
            if receta.override_grasas_agregadas is not None
            else calc_grasas
        )
    )
    tiene_sodio = bool(
        normativa.evalua_sodio_agregado
        and (
            receta.override_sodio_agregado
            if receta.override_sodio_agregado is not None
            else calc_sodio
        )
    )
    contiene_edulcorantes = bool(
        normativa.evalua_edulcorantes
        and (
            receta.override_edulcorantes
            if receta.override_edulcorantes is not None
            else calc_edulcorantes
        )
    )
    contiene_cafeina = bool(
        normativa.evalua_cafeina
        and (
            receta.override_cafeina
            if receta.override_cafeina is not None
            else calc_cafeina
        )
    )

    envasado_ausencia_cliente = bool(producto.envasado_ausencia_cliente)

    # 3. Evaluación contra las reglas de la versión activa de parámetros normativos
    # Criterio 1: Envasado en ausencia del cliente
    if normativa.requiere_envasado_ausencia_cliente and not envasado_ausencia_cliente:
        dictamen = DictamenAplicabilidad.NO_APLICA
        aplica_rotulado = False
        dictamen_titulo = MensajesAplicabilidad.NO_APLICA_TITULO
        motivo = MensajesAplicabilidad.NO_APLICA_MOTIVO
    else:
        # Criterios 2 y 3: Sincronizado estrictamente con los 5 valores efectivos
        tiene_algun_agregado = (
            tiene_azucares
            or tiene_grasas
            or tiene_sodio
            or contiene_edulcorantes
            or contiene_cafeina
        )

        if tiene_algun_agregado:
            dictamen = DictamenAplicabilidad.APLICA
            aplica_rotulado = True
            dictamen_titulo = MensajesAplicabilidad.APLICA_TITULO
            motivo = MensajesAplicabilidad.APLICA_MOTIVO
        else:
            dictamen = DictamenAplicabilidad.EXCEPTUADO
            aplica_rotulado = False
            dictamen_titulo = MensajesAplicabilidad.EXCEPTUADO_TITULO
            motivo = MensajesAplicabilidad.EXCEPTUADO_MOTIVO

    version_normativa = f"{normativa.nombre} ({normativa.version})"

    return schemas.AplicabilidadFrontalOut(
        receta_id=receta.id,
        codigo_receta=receta.codigo_receta,
        producto_id=producto.id,
        producto_nombre=producto.nombre,
        envasado_ausencia_cliente=envasado_ausencia_cliente,
        calculado_azucares_agregados=calc_azucares,
        calculado_grasas_agregadas=calc_grasas,
        calculado_sodio_agregado=calc_sodio,
        calculado_edulcorantes=calc_edulcorantes,
        calculado_cafeina=calc_cafeina,
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
        version_normativa=version_normativa,
        puede_editar_overrides=_puede_editar_overrides(db, receta),
    )


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
        receta.override_azucares_agregados = None
        receta.override_grasas_agregadas = None
        receta.override_sodio_agregado = None
        receta.override_edulcorantes = None
        receta.override_cafeina = None
        receta.es_aplicabilidad_forzada_manualmente = False
    else:
        if payload.override_azucares_agregados is not None:
            receta.override_azucares_agregados = payload.override_azucares_agregados
        if payload.override_grasas_agregadas is not None:
            receta.override_grasas_agregadas = payload.override_grasas_agregadas
        if payload.override_sodio_agregado is not None:
            receta.override_sodio_agregado = payload.override_sodio_agregado
        if payload.override_edulcorantes is not None:
            receta.override_edulcorantes = payload.override_edulcorantes
        if payload.override_cafeina is not None:
            receta.override_cafeina = payload.override_cafeina

        # Se considera forzada manualmente si hay al menos un override explícito activo
        tiene_overrides = any(
            getattr(receta, campo) is not None
            for campo in (
                "override_azucares_agregados",
                "override_grasas_agregadas",
                "override_sodio_agregado",
                "override_edulcorantes",
                "override_cafeina",
            )
        )
        receta.es_aplicabilidad_forzada_manualmente = tiene_overrides

    db.commit()
    db.refresh(receta)
    return evaluar_aplicabilidad_frontal(db, receta_id)
