from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.alimento_referencia.models import AlimentoReferencia
from src.insumos.constants import Constantes
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions
from src.unidad_medida.models import UnidadMedida
from src.unidad_medida import exceptions as unidad_medida_exceptions
from src.recetas.models import Receta, PasoReceta, PasoInsumo
from src.recetas.constants import EstadoReceta
from src.utils.busqueda import condicion_busqueda


def _norm_dec(valor) -> Decimal | None:
    """Normaliza un valor numérico a Decimal con 2 decimales para comparaciones."""
    if valor is None:
        return None
    return Decimal(str(valor)).quantize(Decimal("0.01"))


def _obtener_alimento_referencia(
    db: Session, ref_id: int | None
) -> AlimentoReferencia | None:
    """Busca un alimento de referencia por ID; lanza error si fue enviado y no existe."""
    if ref_id is None:
        return None
    ref = db.get(AlimentoReferencia, ref_id)
    if ref is None:
        raise exceptions.AlimentoReferenciaNoExiste()
    return ref


def _nombre_fuente_por_defecto(ref: AlimentoReferencia) -> str:
    """Genera la etiqueta de fuente nutricional según si la referencia es SARA 2 o propia."""
    prefijo = "SARA 2" if ref.es_oficial_sara else "Referencia propia"
    return f"{prefijo} - {ref.alimento}"[:200]


def _hay_datos_nutricionales(valores: dict) -> bool:
    """Indica si se informó al menos un nutriente, referencia o fuente nutricional."""
    if any(valores.get(c) is not None for c in Constantes.CAMPOS_NUTRIENTES_COMPLETOS):
        return True
    if valores.get("alimento_referencia_id") is not None:
        return True
    if (valores.get("fuente_nutricional") or "").strip():
        return True
    return False


def _difiere_de_referencia(valores: dict, ref: AlimentoReferencia) -> bool:
    """Compara solo los 7 nutrientes precargados de la referencia (ignora azúcares y trans)."""
    for campo_ref, campo_ins in Constantes.MAPA_REFERENCIA_INSUMO.items():
        val_ins = _norm_dec(valores.get(campo_ins))
        val_ref = _norm_dec(getattr(ref, campo_ref))
        if val_ins is not None and val_ins != val_ref:
            return True
    return False


def _normalizar_base_calculo(datos: dict) -> None:
    """Convierte el enum BaseCalculo a string plano ('100g' o '100ml') antes de persistir."""
    base = datos.get("base_calculo")
    if hasattr(base, "value"):
        datos["base_calculo"] = base.value


def _procesar_trazabilidad_creacion(
    db: Session, datos_creacion: dict, usuario_id: int | None
) -> None:
    """Completa fuente, fecha de carga y auditoría de modificación al crear un insumo."""
    _normalizar_base_calculo(datos_creacion)
    ref = _obtener_alimento_referencia(db, datos_creacion.get("alimento_referencia_id"))
    if ref is not None and not (datos_creacion.get("fuente_nutricional") or "").strip():
        datos_creacion["fuente_nutricional"] = _nombre_fuente_por_defecto(ref)

    if not _hay_datos_nutricionales(datos_creacion):
        return

    ahora = datetime.now()
    datos_creacion["fecha_carga_nutricional"] = ahora
    if ref is not None and _difiere_de_referencia(datos_creacion, ref):
        datos_creacion["es_nutricion_modificada"] = True
        datos_creacion["modificado_por_usuario_id"] = usuario_id
        datos_creacion["fecha_modificacion_nutricional"] = ahora


def _procesar_trazabilidad_edicion(
    db: Session, db_insumo: Insumo, update_data: dict, usuario_id: int | None
) -> None:
    """Actualiza o revierte la auditoría nutricional según cambios de nutrientes o referencia."""
    _normalizar_base_calculo(update_data)
    if not any(k in update_data for k in Constantes.CAMPOS_SEGUIMIENTO_NUTRICIONAL):
        return

    efectivo = {
        campo: update_data.get(campo, getattr(db_insumo, campo))
        for campo in Constantes.CAMPOS_SEGUIMIENTO_NUTRICIONAL
    }

    if "alimento_referencia_id" in update_data:
        ref = _obtener_alimento_referencia(db, update_data["alimento_referencia_id"])
    else:
        ref = (
            db.get(AlimentoReferencia, db_insumo.alimento_referencia_id)
            if db_insumo.alimento_referencia_id is not None
            else None
        )

    if ref is not None and not (efectivo.get("fuente_nutricional") or "").strip():
        update_data["fuente_nutricional"] = _nombre_fuente_por_defecto(ref)

    cambio_nutrientes = any(
        k in update_data and _norm_dec(update_data[k]) != _norm_dec(getattr(db_insumo, k))
        for k in Constantes.CAMPOS_NUTRIENTES_COMPLETOS
    )

    ahora = datetime.now()
    if db_insumo.fecha_carga_nutricional is None:
        if _hay_datos_nutricionales(efectivo):
            update_data["fecha_carga_nutricional"] = ahora
            if ref is not None and _difiere_de_referencia(efectivo, ref):
                update_data["es_nutricion_modificada"] = True
                update_data["modificado_por_usuario_id"] = usuario_id
                update_data["fecha_modificacion_nutricional"] = ahora
        return

    # Ya tenía carga nutricional previa
    reimporta_referencia = (
        "alimento_referencia_id" in update_data
        and update_data["alimento_referencia_id"] is not None
        and ref is not None
    )
    if reimporta_referencia:
        if _difiere_de_referencia(efectivo, ref):
            update_data["es_nutricion_modificada"] = True
            update_data["modificado_por_usuario_id"] = usuario_id
            update_data["fecha_modificacion_nutricional"] = ahora
        else:
            update_data["es_nutricion_modificada"] = False
            update_data["modificado_por_usuario_id"] = None
            update_data["fecha_modificacion_nutricional"] = None
    elif cambio_nutrientes:
        if ref is not None and not _difiere_de_referencia(efectivo, ref):
            update_data["es_nutricion_modificada"] = False
            update_data["modificado_por_usuario_id"] = None
            update_data["fecha_modificacion_nutricional"] = None
        else:
            update_data["es_nutricion_modificada"] = True
            update_data["modificado_por_usuario_id"] = usuario_id
            update_data["fecha_modificacion_nutricional"] = ahora


def _validar_equivalencias_magnitud(
    tipo_magnitud: str,
    densidad_g_ml: float | None,
    peso_unitario_g: float | None,
) -> None:
    magnitud = (tipo_magnitud or "").strip().lower()

    if magnitud == "volumen":
        if peso_unitario_g is not None:
            raise exceptions.PesoUnitarioSoloCantidad()
    elif magnitud == "cantidad":
        if densidad_g_ml is not None:
            raise exceptions.DensidadSoloVolumen()
    elif magnitud == "masa":
        if densidad_g_ml is not None or peso_unitario_g is not None:
            raise exceptions.EquivalenciaNoAplicaMasa()


def crear_insumo(
    db: Session, insumo: schemas.InsumoCreate, usuario_id: int | None = None
) -> schemas.Insumo:
    db_insumo_existente = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre))
    if db_insumo_existente:
        if db_insumo_existente.disponible:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(insumo_id=db_insumo_existente.id)

    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == insumo.unidad_medida_id))
    if db_unidad is None or not db_unidad.disponible:
        raise unidad_medida_exceptions.UnidadMedidaReactivar()

    _validar_equivalencias_magnitud(
        db_unidad.tipo_magnitud,
        insumo.densidad_g_ml,
        insumo.peso_unitario_g,
    )

    datos_creacion = insumo.model_dump()
    datos_creacion["disponible"] = True
    _procesar_trazabilidad_creacion(db, datos_creacion, usuario_id)

    db_insumo = Insumo(**datos_creacion)
    db.add(db_insumo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_insumo)
    return db_insumo


def leer_insumo(db: Session, insumo_id: int) -> schemas.Insumo:
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if not db_insumo:
        raise exceptions.InsumoNoExiste()
    return db_insumo


def _validar_nombre_unico_edicion(
    db: Session, insumo_id: int, update_data: dict
) -> None:
    """Verifica que el nuevo nombre no pertenezca a otro insumo."""
    if "nombre" not in update_data:
        return
    db_insumo_duplicado = db.scalar(
        select(Insumo).where(
            Insumo.nombre == update_data["nombre"], Insumo.id != insumo_id
        )
    )
    if db_insumo_duplicado:
        raise exceptions.NombreDuplicado()


def _validar_cambio_disponibilidad(
    db: Session, db_insumo: Insumo, insumo_id: int, update_data: dict
) -> None:
    """Valida baja/alta lógica: estado previo, recetas activas y unidad activa."""
    if "disponible" not in update_data:
        return
    nuevo_disponible = update_data["disponible"]
    if db_insumo.disponible == nuevo_disponible:
        if nuevo_disponible:
            raise exceptions.InsumoActivo()
        raise exceptions.InsumoBaja()

    if not nuevo_disponible:
        receta_activa = db.scalar(
            select(Receta)
            .join(PasoReceta, PasoReceta.receta_id == Receta.id)
            .join(PasoInsumo, PasoInsumo.paso_id == PasoReceta.id)
            .where(
                PasoInsumo.insumo_id == insumo_id,
                Receta.estado == EstadoReceta.ACTIVA,
            )
        )
        if receta_activa:
            raise exceptions.InsumoConRecetaActiva(
                insumo_nombre=db_insumo.nombre,
                receta_nombre=receta_activa.nombre_receta,
            )
        return

    unidad_id = update_data.get("unidad_medida_id", db_insumo.unidad_medida_id)
    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == unidad_id))
    if db_unidad is None or not db_unidad.disponible:
        raise unidad_medida_exceptions.UnidadMedidaReactivar()


def _validar_y_ajustar_equivalencias_edicion(
    db: Session, db_insumo: Insumo, update_data: dict
) -> None:
    """Limpia equivalencias incompatibles al cambiar unidad y valida densidad/peso."""
    if not any(
        k in update_data for k in ("unidad_medida_id", "densidad_g_ml", "peso_unitario_g")
    ):
        return
    target_unidad_id = update_data.get("unidad_medida_id", db_insumo.unidad_medida_id)
    unidad_obj = db.scalar(select(UnidadMedida).where(UnidadMedida.id == target_unidad_id))
    if not unidad_obj:
        return

    magnitud_nueva = (unidad_obj.tipo_magnitud or "").strip().lower()
    if (
        "unidad_medida_id" in update_data
        and update_data["unidad_medida_id"] != db_insumo.unidad_medida_id
    ):
        if magnitud_nueva != "volumen" and "densidad_g_ml" not in update_data:
            update_data["densidad_g_ml"] = None
        if magnitud_nueva != "cantidad" and "peso_unitario_g" not in update_data:
            update_data["peso_unitario_g"] = None

    densidad_efectiva = update_data.get("densidad_g_ml", db_insumo.densidad_g_ml)
    peso_efectivo = update_data.get("peso_unitario_g", db_insumo.peso_unitario_g)
    _validar_equivalencias_magnitud(
        unidad_obj.tipo_magnitud,
        densidad_efectiva,
        peso_efectivo,
    )


def _limpiar_nutricion_para_envase(update_data: dict) -> None:
    """Limpia nutrientes y trazabilidad cuando un insumo pasa a categoría envase."""
    for c in Constantes.CAMPOS_NUTRIENTES_COMPLETOS:
        update_data[c] = None
    update_data["base_calculo"] = "100g"
    update_data["alimento_referencia_id"] = None
    update_data["fuente_nutricional"] = None
    update_data["fecha_carga_nutricional"] = None
    update_data["es_nutricion_modificada"] = False
    update_data["modificado_por_usuario_id"] = None
    update_data["fecha_modificacion_nutricional"] = None


def _validar_y_ajustar_atributos_categoria(
    db: Session, db_insumo: Insumo, update_data: dict, usuario_id: int | None
) -> None:
    """Aplica reglas de aditivo, envase y trazabilidad nutricional según la categoría."""
    categoria_efectiva = (
        update_data.get("categoria", db_insumo.categoria) or ""
    ).strip().lower()
    cambio_categoria = (
        "categoria" in update_data and update_data["categoria"] != db_insumo.categoria
    )

    if categoria_efectiva == schemas.Categoria.ADITIVO.value:
        cf_str = (update_data.get("clase_funcional", db_insumo.clase_funcional) or "").strip()
        if not cf_str:
            raise exceptions.ClaseFuncionalRequeridaAditivo()
        ins_str = (update_data.get("numero_ins", db_insumo.numero_ins) or "").strip()
        if (
            cf_str.lower() not in Constantes.CLASES_SIN_INS_OBLIGATORIO
            and not ins_str
        ):
            raise exceptions.NumeroInsRequeridoAditivo()
    elif cambio_categoria:
        update_data["clase_funcional"] = None
        update_data["numero_ins"] = None
    else:
        cf_val = update_data.get("clase_funcional")
        ins_val = update_data.get("numero_ins")
        if (cf_val and cf_val.strip()) or (ins_val and ins_val.strip()):
            raise exceptions.AtributosAditivoNoAplican()

    if categoria_efectiva == schemas.Categoria.ENVASE.value:
        envia_nutricion = (
            any(
                update_data.get(c) is not None
                for c in Constantes.CAMPOS_NUTRIENTES_COMPLETOS
            )
            or update_data.get("alimento_referencia_id") is not None
            or bool((update_data.get("fuente_nutricional") or "").strip())
        )
        if envia_nutricion:
            raise exceptions.NutricionNoAplicaEnvase()
        if cambio_categoria:
            _limpiar_nutricion_para_envase(update_data)
    else:
        _procesar_trazabilidad_edicion(db, db_insumo, update_data, usuario_id)


def modificar_insumo(
    db: Session,
    insumo_id: int,
    insumo: schemas.InsumoUpdate,
    usuario_id: int | None = None,
) -> schemas.InsumoUpdate:
    db_insumo = leer_insumo(db, insumo_id)
    update_data = insumo.model_dump(exclude_unset=True)

    _validar_nombre_unico_edicion(db, insumo_id, update_data)
    _validar_cambio_disponibilidad(db, db_insumo, insumo_id, update_data)
    _validar_y_ajustar_equivalencias_edicion(db, db_insumo, update_data)
    _validar_y_ajustar_atributos_categoria(db, db_insumo, update_data, usuario_id)

    if update_data:
        db.execute(update(Insumo).where(Insumo.id == insumo_id).values(**update_data))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_insumo)
    return db_insumo


def eliminar_insumo(db: Session, insumo_id: int) -> schemas.InsumoDelete:
    insumo = schemas.InsumoUpdate(disponible=False)
    return modificar_insumo(db, insumo_id, insumo)


def listar_insumos(
    db: Session,
    busqueda: str | None = None,
    disponible: bool | None = None,
):
    consulta = select(Insumo)

    if busqueda and busqueda.strip():
        consulta = consulta.join(
            UnidadMedida, Insumo.unidad_medida_id == UnidadMedida.id
        ).where(
            condicion_busqueda(
                [Insumo.nombre, Insumo.categoria, UnidadMedida.nombre, UnidadMedida.simbolo],
                busqueda,
            )
        )

    if disponible is not None:
        consulta = consulta.where(Insumo.disponible.is_(disponible))

    return db.scalars(consulta).all()
