from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from src.insumos.models import Insumo
from src.productos.models import Producto
from src.recetas.models import Receta, PasoReceta, PasoInsumo
from src.rotulado import exceptions, schemas
from src.rotulado.constants import (
    DictamenAplicabilidad,
    MensajesAplicabilidad,
    NormativaDefecto,
)
from src.rotulado.models import NormativaRotulado


def inicializar_normativa_rotulado(db: Session) -> NormativaRotulado:
    """Crea la normativa de rotulado frontal por defecto (Ley 27.642) si no existe ninguna."""
    normativa = db.scalar(
        select(NormativaRotulado).where(NormativaRotulado.codigo_normativa == NormativaDefecto.CODIGO)
    )
    if not normativa:
        normativa = NormativaRotulado(
            codigo_normativa=NormativaDefecto.CODIGO,
            nombre=NormativaDefecto.NOMBRE,
            version=NormativaDefecto.VERSION,
            activa=True,
            requiere_envasado_ausencia_cliente=NormativaDefecto.REQUIERE_ENVASADO,
            evalua_azucares_agregados=NormativaDefecto.EVALUA_AZUCARES,
            evalua_grasas_agregadas=NormativaDefecto.EVALUA_GRASAS,
            evalua_sodio_agregado=NormativaDefecto.EVALUA_SODIO,
            evalua_edulcorantes=NormativaDefecto.EVALUA_EDULCORANTES,
            evalua_cafeina=NormativaDefecto.EVALUA_CAFEINA,
            descripcion="Parámetros iniciales de aplicabilidad según Ley 27.642 y Decreto Reglamentario 151/2022.",
        )
        db.add(normativa)
        db.commit()
        db.refresh(normativa)
    return normativa


def obtener_normativa_activa(db: Session) -> NormativaRotulado:
    """Obtiene la versión activa de parámetros normativos o la inicializa."""
    normativa = db.scalar(
        select(NormativaRotulado).where(NormativaRotulado.activa == True)
    )
    if not normativa:
        normativa = inicializar_normativa_rotulado(db)
    return normativa


def _obtener_receta_con_relaciones(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(
        select(Receta)
        .options(
            joinedload(Receta.producto),
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
    normativa = obtener_normativa_activa(db)

    # 1. Detección automática desde insumos y aditivos
    automatico = _detectar_agregados_automaticos(receta)
    calc_azucares = automatico["azucares"]
    calc_grasas = automatico["grasas"]
    calc_sodio = automatico["sodio"]
    calc_edulcorantes = automatico["edulcorantes"]
    calc_cafeina = automatico["cafeina"]

    # 2. Combinación con overrides manuales guardados en Receta
    tiene_azucares = (
        receta.override_azucares_agregados
        if receta.override_azucares_agregados is not None
        else calc_azucares
    )
    tiene_grasas = (
        receta.override_grasas_agregadas
        if receta.override_grasas_agregadas is not None
        else calc_grasas
    )
    tiene_sodio = (
        receta.override_sodio_agregado
        if receta.override_sodio_agregado is not None
        else calc_sodio
    )
    contiene_edulcorantes = (
        receta.override_edulcorantes
        if receta.override_edulcorantes is not None
        else calc_edulcorantes
    )
    contiene_cafeina = (
        receta.override_cafeina
        if receta.override_cafeina is not None
        else calc_cafeina
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
        # Criterios 2 y 3: Presencia de nutrientes críticos agregados o aditivos regulados
        tiene_algun_agregado = (
            (normativa.evalua_azucares_agregados and tiene_azucares)
            or (normativa.evalua_grasas_agregadas and tiene_grasas)
            or (normativa.evalua_sodio_agregado and tiene_sodio)
            or (normativa.evalua_edulcorantes and contiene_edulcorantes)
            or (normativa.evalua_cafeina and contiene_cafeina)
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
    )


def actualizar_overrides_aplicabilidad(
    db: Session, receta_id: int, payload: schemas.AplicabilidadFrontalIn
) -> schemas.AplicabilidadFrontalOut:
    """Actualiza o restablece los overrides manuales de aplicabilidad de rotulado frontal en una receta."""
    receta = _obtener_receta_con_relaciones(db, receta_id)

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
