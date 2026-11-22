from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import List, Optional
import unicodedata

from sqlalchemy import func, select, cast, String
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.configuracion_nutricional.services import listar_parametros_nutricionales
from src.personal import exceptions as personal_exceptions
from src.personal.models import Persona
from src.recetas import exceptions, schemas
from src.recetas.constants import EstadoReceta, NutricionConstantes, TipoRecurso
from src.recetas.models import Receta, PasoReceta, PasoEquipo, PasoInsumo
from src.equipos.models import Equipo
from src.insumos.constants import Constantes as InsumoConstantes
from src.insumos.models import Insumo 
from src.productos.models import Producto
from src.unidad_medida.services import convertir_a_gramos

# --- FUNCIONES AUXILIARES ---

def _validar_usuario_creador(db: Session, usuario_id: int) -> Persona:
    """Valida que la persona que crea/clona la receta exista y esté activa."""
    usuario = db.scalar(select(Persona).where(Persona.id == usuario_id))
    if not usuario:
        raise personal_exceptions.PersonaNoEncontrada()
    if not usuario.activo:
        raise personal_exceptions.PersonaInactiva()
    return usuario


def _extraer_prefijo_producto(nombre: str) -> str:
    """Extrae un prefijo en mayúsculas a partir del nombre del producto.
    
    Ejemplos:
    - 'Pan de Molde' -> 'PM'
    - 'Medialunas de Grasa' -> 'MG'
    - 'Bagel' -> 'BAG'
    - 'Pan' -> 'PAN'
    """
    nombre_limpio = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode("ascii")
    palabras = re.findall(r"[A-Za-z0-9]+", nombre_limpio)
    stop_words = {"DE", "DEL", "LA", "LAS", "EL", "LOS", "CON", "Y", "EN", "PARA", "POR", "A", "AL"}
    palabras_significativas = [p for p in palabras if p.upper() not in stop_words]

    if not palabras_significativas:
        palabras_significativas = palabras or ["REC"]

    if len(palabras_significativas) >= 2:
        prefijo = "".join(p[0].upper() for p in palabras_significativas[:4])
    else:
        prefijo = palabras_significativas[0][:3].upper()

    return prefijo or "REC"


def _generar_codigo_receta(db: Session, producto: Producto) -> str:
    prefijo = _extraer_prefijo_producto(producto.nombre)
    prefijo_patron = f"REC-{prefijo}-"
    recetas = db.scalars(
        select(Receta.codigo_receta).where(Receta.codigo_receta.like(f"{prefijo_patron}%"))
    ).all()
    ultimo_numero = 0
    for codigo in recetas:
        if codigo and codigo.startswith(prefijo_patron):
            try:
                parte = codigo[len(prefijo_patron):]
                if parte.isdigit():
                    num = int(parte)
                    if num > ultimo_numero:
                        ultimo_numero = num
            except Exception:
                continue
    nuevo_numero = ultimo_numero + 1
    return f"REC-{prefijo}-{nuevo_numero:03d}"


def _estado_actual(receta: Receta) -> str:
    return receta.estado.value if hasattr(receta.estado, "value") else receta.estado


def _siguiente_version_receta(db: Session, producto_id: int) -> int:
    """Devuelve el próximo número de versión correlativo para el producto dado."""
    ultima = db.scalar(
        select(func.max(Receta.version)).where(Receta.producto_id == producto_id)
    )
    return (ultima or 0) + 1


def _validar_recursos_activos(db: Session, equipos: Optional[list] = None, insumos: Optional[list] = None):
    """Valida que los equipos e insumos solicitados existan y estén activos en la base de datos."""
    if equipos:
        for eq in equipos:
            eq_id = eq.get("equipo_id") if isinstance(eq, dict) else eq.equipo_id
            eq_db = db.scalar(select(Equipo).where(Equipo.id == eq_id))
            if not eq_db or not eq_db.activo:
                raise exceptions.RecursoInactivo(tipo_recurso=TipoRecurso.EQUIPO, recurso_id=eq_id)
                
    if insumos:
        for ins in insumos:
            ins_id = ins.get("insumo_id") if isinstance(ins, dict) else ins.insumo_id
            ins_db = db.scalar(select(Insumo).where(Insumo.id == ins_id))
            if not ins_db or not ins_db.disponible:
                raise exceptions.RecursoInactivo(tipo_recurso=TipoRecurso.INSUMO, recurso_id=ins_id)


def _filtrar_recursos_unicos(recursos, id_key: str, modelo_orm):
    """Filtra duplicados basándose en 'id_key' y retorna una lista de instancias ORM."""
    if not recursos:
        return []
    unicos = []
    vistos = set()
    for item in recursos:
        data = item if isinstance(item, dict) else item.model_dump()
        item_id = data[id_key]
        if item_id not in vistos:
            unicos.append(modelo_orm(**data))
            vistos.add(item_id)
    return unicos


def _clonar_paso(paso_antiguo: PasoReceta) -> PasoReceta:
    """Recibe un paso antiguo y devuelve una instancia nueva con sus insumos y equipos copiados."""
    return PasoReceta(
        numero_orden=paso_antiguo.numero_orden,
        titulo=paso_antiguo.titulo,
        instrucciones=paso_antiguo.instrucciones,
        equipos=[
            PasoEquipo(
                equipo_id=e.equipo_id, 
                cantidad=e.cantidad
            ) for e in paso_antiguo.equipos
        ],
        insumos=[
            PasoInsumo(
                insumo_id=i.insumo_id, 
                cantidad_consumo_estimada=i.cantidad_consumo_estimada
            ) for i in paso_antiguo.insumos
        ]
    )

# FUNCIONES AUXILIARES PARA CÁLCULO DE COMPOSICIÓN PORCENTUAL
 
def _consolidar_insumos_receta(receta: Receta) -> dict[int, dict]:
    """Agrupa las cantidades nominales de todos los insumos de los pasos de la receta,
    descartando la categoría 'envase'.
    """
    insumos_map: dict[int, dict] = {}
    for paso in receta.pasos or []:
        for pi in paso.insumos or []:
            insumo = pi.insumo
            if not insumo:
                continue
            cat = (insumo.categoria or "").strip().lower()
            if cat == "envase":
                continue

            i_id = insumo.id
            cant = float(pi.cantidad_consumo_estimada)
            if i_id not in insumos_map:
                insumos_map[i_id] = {
                    "insumo": insumo,
                    "cantidad_nominal": cant,
                }
            else:
                insumos_map[i_id]["cantidad_nominal"] += cant
    return insumos_map


def _convertir_insumo_a_masa(insumo: Insumo, cant_nom: float) -> tuple[Optional[float], Optional[schemas.InsumoSinEquivalenciaOut]]:
    """Convierte la cantidad nominal de un insumo a gramos. Si falta la equivalencia,
    retorna (None, InsumoSinEquivalenciaOut con el diagnóstico explicativo).
    """
    unidad = insumo.unidad_medida
    simbolo_u = unidad.simbolo if unidad else ""
    magnitud_u = (unidad.tipo_magnitud if unidad else "").lower()

    masa_g = convertir_a_gramos(
        cantidad=cant_nom,
        unidad=unidad,
        densidad_g_ml=insumo.densidad_g_ml,
        peso_unitario_g=insumo.peso_unitario_g,
    ) if unidad else None

    if masa_g is not None:
        return round(masa_g, 3), None

    if magnitud_u == "volumen":
        eq_req = "Densidad (g/ml)"
        msg = f"El insumo '{insumo.nombre}' se mide en volumen ({simbolo_u}) y requiere que se configure su densidad (g/ml) en el Maestro de Insumos."
    elif magnitud_u == "cantidad":
        eq_req = "Peso promedio unitario (g)"
        msg = f"El insumo '{insumo.nombre}' se mide en cantidad ({simbolo_u}) y requiere que se configure su peso promedio unitario (g) en el Maestro de Insumos."
    else:
        eq_req = "Equivalencia a gramos"
        msg = f"No se pudo convertir la unidad '{simbolo_u}' del insumo '{insumo.nombre}' a gramos."

    sin_eq = schemas.InsumoSinEquivalenciaOut(
        insumo_id=insumo.id,
        nombre=insumo.nombre,
        unidad_simbolo=simbolo_u,
        tipo_magnitud=magnitud_u,
        equivalencia_requerida=eq_req,
        mensaje=msg,
    )
    return None, sin_eq


def _calcular_porcentajes_y_grupos(
    items_calculados: list[dict],
    peso_total_mezcla_g: float,
    es_completa: bool,
) -> tuple[list[schemas.ItemComposicionPorcentualOut], list[schemas.ItemComposicionPorcentualOut], float]:
    """Calcula el porcentaje de cada insumo sobre la mezcla y divide en ingredientes vs aditivos,
    ordenados descendentemente por presencia.
    """
    ingredientes: list[schemas.ItemComposicionPorcentualOut] = []
    aditivos: list[schemas.ItemComposicionPorcentualOut] = []
    suma_porcentajes = 0.0

    for item in items_calculados:
        if es_completa and item["masa_equivalente_g"] is not None and peso_total_mezcla_g > 0:
            porcentaje = round((item["masa_equivalente_g"] / peso_total_mezcla_g) * 100.0, 2)
            item["porcentaje_mezcla"] = porcentaje
            suma_porcentajes += porcentaje

        out_item = schemas.ItemComposicionPorcentualOut(**item)
        cat = (item["categoria"] or "").strip().lower()
        if cat == "aditivo":
            aditivos.append(out_item)
        else:
            ingredientes.append(out_item)

    criterio_orden = lambda x: (x.porcentaje_mezcla if x.porcentaje_mezcla is not None else (x.masa_equivalente_g or 0))
    ingredientes.sort(key=criterio_orden, reverse=True)
    aditivos.sort(key=criterio_orden, reverse=True)

    return ingredientes, aditivos, round(suma_porcentajes, 2)


# --- SERVICIOS DE RECETA ---

def obtener_receta_por_id(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(
        select(Receta)
        .options(
            joinedload(Receta.usuario_creador),
            joinedload(Receta.producto).joinedload(Producto.unidad_medida),
            joinedload(Receta.pasos).joinedload(PasoReceta.equipos).joinedload(PasoEquipo.equipo),
            joinedload(Receta.pasos).joinedload(PasoReceta.insumos).joinedload(PasoInsumo.insumo).joinedload(Insumo.unidad_medida),
        )
        .where(Receta.id == receta_id)
    )
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return receta


def obtener_receta_activa_por_id(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(
        select(Receta)
        .options(
            joinedload(Receta.usuario_creador),
            joinedload(Receta.producto).joinedload(Producto.unidad_medida),
            joinedload(Receta.pasos).joinedload(PasoReceta.equipos).joinedload(PasoEquipo.equipo),
            joinedload(Receta.pasos).joinedload(PasoReceta.insumos).joinedload(PasoInsumo.insumo).joinedload(Insumo.unidad_medida),
        )
        .where(Receta.id == receta_id, Receta.estado == EstadoReceta.ACTIVA)
    )
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return receta


def listar_recetas(
    db: Session,
    busqueda: Optional[str] = None,
    estado: Optional[EstadoReceta] = None,
    insumo_id: Optional[int] = None,
    equipo_id: Optional[int] = None,
    producto_id: Optional[int] = None,
) -> List[Receta]:
    query = (
        select(Receta)
        .join(Receta.producto)
        .options(
            joinedload(Receta.usuario_creador),
            joinedload(Receta.producto).joinedload(Producto.unidad_medida),
            joinedload(Receta.pasos).joinedload(PasoReceta.equipos).joinedload(PasoEquipo.equipo),
            joinedload(Receta.pasos).joinedload(PasoReceta.insumos).joinedload(PasoInsumo.insumo).joinedload(Insumo.unidad_medida),
        )
    )

    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        query = query.where(
            Receta.codigo_receta.ilike(termino)
            | Receta.nombre_receta.ilike(termino)
            | Producto.nombre.ilike(termino)
            | cast(Receta.rendimiento_estandar, String).ilike(termino)
            | cast(Receta.tiempo_estimado_total, String).ilike(termino)
            | Receta.pasos.any(
                PasoReceta.insumos.any(PasoInsumo.insumo.has(Insumo.nombre.ilike(termino)))
                | PasoReceta.equipos.any(PasoEquipo.equipo.has(Equipo.nombre.ilike(termino)))
            )
        )

    if estado:
        query = query.where(Receta.estado == estado)

    if producto_id:
        query = query.where(Receta.producto_id == producto_id)

    if insumo_id:
        query = query.where(
            Receta.pasos.any(
                PasoReceta.insumos.any(PasoInsumo.insumo_id == insumo_id)
            )
        )

    if equipo_id:
        query = query.where(
            Receta.pasos.any(
                PasoReceta.equipos.any(PasoEquipo.equipo_id == equipo_id)
            )
        )

    return list(db.scalars(query.order_by(Receta.fecha_creacion.desc())).unique().all())


def obtener_receta_borrador(db: Session) -> Optional[Receta]:
    return db.scalar(
        select(Receta)
        .options(
            joinedload(Receta.usuario_creador),
            joinedload(Receta.producto).joinedload(Producto.unidad_medida),
        )
        .where(Receta.estado == EstadoReceta.BORRADOR)
        .order_by(Receta.fecha_creacion.desc())
    )


def obtener_recetas_activas(
    db: Session,
    busqueda: Optional[str] = None,
    producto_id: Optional[int] = None,
) -> List[Receta]:
    query = (
        select(Receta)
        .join(Receta.producto)
        .options(
            joinedload(Receta.usuario_creador),
            joinedload(Receta.producto).joinedload(Producto.unidad_medida),
            joinedload(Receta.pasos).joinedload(PasoReceta.equipos).joinedload(PasoEquipo.equipo),
            joinedload(Receta.pasos).joinedload(PasoReceta.insumos).joinedload(PasoInsumo.insumo).joinedload(Insumo.unidad_medida),
        )
        .where(Receta.estado == EstadoReceta.ACTIVA)
    )

    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        query = query.where(
            Receta.codigo_receta.ilike(termino)
            | Receta.nombre_receta.ilike(termino)
            | Producto.nombre.ilike(termino)
            | cast(Receta.rendimiento_estandar, String).ilike(termino)
            | cast(Receta.tiempo_estimado_total, String).ilike(termino)
            | Receta.pasos.any(
                PasoReceta.insumos.any(PasoInsumo.insumo.has(Insumo.nombre.ilike(termino)))
                | PasoReceta.equipos.any(PasoEquipo.equipo.has(Equipo.nombre.ilike(termino)))
            )
        )

    if producto_id:
        query = query.where(Receta.producto_id == producto_id)

    return list(db.scalars(query.order_by(Receta.nombre_receta.asc())).unique().all())


def crear_receta_borrador(db: Session, receta: schemas.RecetaCreate, usuario_id: int) -> Receta:
    _validar_usuario_creador(db, usuario_id)

    producto = db.scalar(select(Producto).where(Producto.id == receta.producto_id))
    if not producto or not producto.activo:
        raise exceptions.ProductoInvalido()

    codigo_receta = _generar_codigo_receta(db, producto)
    from src.configuracion.services import inicializar_parametros_frontales
    from src.rotulado.services import obtener_normativa_activa

    normativa_activa = obtener_normativa_activa(db)
    version_frontal_vigente = inicializar_parametros_frontales(db)

    nueva_receta = Receta(
        codigo_receta=codigo_receta,
        nombre_receta=receta.nombre_receta,
        version=_siguiente_version_receta(db, receta.producto_id),
        producto_id=receta.producto_id,
        rendimiento_estandar=receta.rendimiento_estandar,
        tamano_porcion=receta.tamano_porcion,
        tiempo_estimado_total=receta.tiempo_estimado_total,
        estado=EstadoReceta.BORRADOR,
        observaciones=receta.observaciones,
        normativa_rotulado_id=normativa_activa.id,
        version_parametro_frontal_id=version_frontal_vigente.id,
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
    if estado_actual == EstadoReceta.ARCHIVADA.value:
        raise exceptions.RecetaArchivadaNoEditable()
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
    """Pasa un borrador a estado ACTIVA, archivando la receta activa anterior de ese producto (si existía)."""
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()

    # Validación 0: El producto debe existir y encontrarse activo
    if not receta.producto or not receta.producto.activo:
        raise exceptions.ProductoInvalido()

    # Validación 1: Debe tener pasos
    if not receta.pasos:
        raise exceptions.RecetaSinPasos()

    # Validación 2: Todos los recursos usados en los pasos deben estar activos
    for paso in receta.pasos:
        _validar_recursos_activos(db, equipos=paso.equipos, insumos=paso.insumos)

    try:
        # Si ya había una receta ACTIVA para este mismo producto, pasa a ARCHIVADA
        receta_vigente = db.scalar(
            select(Receta).where(
                Receta.producto_id == receta.producto_id,
                Receta.estado == EstadoReceta.ACTIVA,
            )
        )
        if receta_vigente:
            receta_vigente.estado = EstadoReceta.ARCHIVADA
            receta_vigente.fecha_baja = datetime.now()

        receta.estado = EstadoReceta.ACTIVA
        receta.fecha_baja = None
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return receta


def archivar_receta(db: Session, receta_id: int) -> Receta:
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.ACTIVA.value:
        raise exceptions.RecetaNoActiva()

    receta.estado = EstadoReceta.ARCHIVADA
    receta.fecha_baja = datetime.now()
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
    """Crea un nuevo borrador copiando la cabecera y los pasos activos de otra receta.
    
    Permite clonar a borrador incluso si algún recurso se inactivó, para que el usuario
    pueda adaptar o reemplazar los recursos inactivos antes de activarla.
    """
    origen = obtener_receta_por_id(db, receta_id)
    _validar_usuario_creador(db, usuario_id)

    producto = db.scalar(select(Producto).where(Producto.id == origen.producto_id))
    if not producto or not producto.activo:
        raise exceptions.ProductoInvalido()

    from src.configuracion.services import inicializar_parametros_frontales
    from src.rotulado.services import obtener_normativa_activa

    normativa_activa = obtener_normativa_activa(db)
    version_frontal_vigente = inicializar_parametros_frontales(db)

    nueva_receta = Receta(
        codigo_receta=_generar_codigo_receta(db, producto),
        nombre_receta=origen.nombre_receta,
        version=_siguiente_version_receta(db, origen.producto_id),
        producto_id=origen.producto_id,
        rendimiento_estandar=origen.rendimiento_estandar,
        tamano_porcion=origen.tamano_porcion,
        tiempo_estimado_total=origen.tiempo_estimado_total,
        estado=EstadoReceta.BORRADOR,
        observaciones=origen.observaciones,
        es_orden_manual=origen.es_orden_manual,
        orden_manual_json=list(origen.orden_manual_json) if origen.orden_manual_json else None,
        override_azucares_agregados=origen.override_azucares_agregados,
        override_grasas_agregadas=origen.override_grasas_agregadas,
        override_sodio_agregado=origen.override_sodio_agregado,
        override_edulcorantes=origen.override_edulcorantes,
        override_cafeina=origen.override_cafeina,
        es_aplicabilidad_forzada_manualmente=origen.es_aplicabilidad_forzada_manualmente,
        normativa_rotulado_id=normativa_activa.id,
        version_parametro_frontal_id=version_frontal_vigente.id,
        fecha_creacion=datetime.now(),
        usuario_creador_id=usuario_id,
        pasos=[_clonar_paso(p) for p in origen.pasos]
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


def eliminar_receta(db: Session, receta_id: int) -> dict:
    """Elimina o da de baja una receta según su estado y su histórico de lotes:

    - Si la receta está en estado BORRADOR:
        Se realiza baja física (eliminación definitiva de la base de datos).
    - Si la receta está ACTIVA:
        - Si NO tiene lotes asociados (not receta.tiene_lotes):
            Se realiza baja física (eliminación definitiva de la base de datos).
        - Si TIENE lotes asociados (receta.tiene_lotes):
            Pasa a estado INHABILITADA (baja lógica) y queda inmutable para preservar
            la trazabilidad histórica de los lotes ya fabricados.
    - Si la receta está INHABILITADA:
        - Si no tiene lotes asociados: se permite baja física.
        - Si tiene lotes asociados: no se permite eliminar (inmutable por trazabilidad).
    """
    receta = obtener_receta_por_id(db, receta_id)
    estado_actual = _estado_actual(receta)

    if estado_actual == EstadoReceta.BORRADOR.value:
        try:
            db.delete(receta)
            db.commit()
            return {"resultado": "eliminada"}
        except IntegrityError:
            db.rollback()
            raise exceptions.RecetaNoEditable()

    elif estado_actual == EstadoReceta.ACTIVA.value:
        if not receta.tiene_lotes:
            try:
                db.delete(receta)
                db.commit()
                return {"resultado": "eliminada"}
            except IntegrityError:
                db.rollback()
                raise exceptions.RecetaNoEditable()
        else:
            receta.estado = EstadoReceta.ARCHIVADA
            receta.fecha_baja = datetime.now()
            try:
                db.commit()
                db.refresh(receta)
                return {"resultado": "archivada"}
            except IntegrityError:
                db.rollback()
                raise exceptions.RecetaNoEditable()

    elif estado_actual == EstadoReceta.ARCHIVADA.value:
        if not receta.tiene_lotes:
            try:
                db.delete(receta)
                db.commit()
                return {"resultado": "eliminada"}
            except IntegrityError:
                db.rollback()
                raise exceptions.RecetaNoEditable()
        else:
            raise exceptions.RecetaConLotesNoEditable()

    return {"resultado": "eliminada"}


# --- SERVICIOS DE PASOS DE RECETA ---

def obtener_paso_por_id(db: Session, paso_id: int) -> PasoReceta:
    paso = db.scalar(select(PasoReceta).where(PasoReceta.id == paso_id))
    if not paso:
        raise exceptions.PasoRecetaNoEncontrado()
    return paso


def listar_pasos_por_receta(db: Session, receta_id: int) -> List[PasoReceta]:
    return list(
        db.scalars(
            select(PasoReceta)
            .where(PasoReceta.receta_id == receta_id)
            .order_by(PasoReceta.numero_orden.asc())
        ).all()
    )


def agregar_paso_a_receta(db: Session, receta_id: int, paso_data: schemas.PasoRecetaCreate) -> PasoReceta:
    receta = obtener_receta_por_id(db, receta_id)
    
    if _estado_actual(receta) != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()

    paso_existente = db.scalar(
        select(PasoReceta).where(
            PasoReceta.receta_id == receta.id,
            PasoReceta.numero_orden == paso_data.numero_orden,
        )
    )
    if paso_existente:
        raise exceptions.NumeroOrdenPasoDuplicado()
        
    _validar_recursos_activos(db, equipos=paso_data.equipos, insumos=paso_data.insumos)
    
    nuevo_paso = PasoReceta(
        receta_id=receta.id,
        numero_orden=paso_data.numero_orden,
        titulo=paso_data.titulo,
        instrucciones=paso_data.instrucciones,
        equipos=_filtrar_recursos_unicos(paso_data.equipos, "equipo_id", PasoEquipo),
        insumos=_filtrar_recursos_unicos(paso_data.insumos, "insumo_id", PasoInsumo)
    )
    
    db.add(nuevo_paso)
    try:
        db.commit()
        db.refresh(nuevo_paso)
    except IntegrityError:
        db.rollback()
        raise exceptions.NumeroOrdenPasoDuplicado()
        
    return nuevo_paso


def modificar_paso(db: Session, paso_id: int, paso_update: schemas.PasoRecetaUpdate) -> PasoReceta:
    paso = obtener_paso_por_id(db, paso_id)
    
    if _estado_actual(paso.receta) != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()
        
    update_data = paso_update.model_dump(exclude_unset=True)

    if "numero_orden" in update_data and update_data["numero_orden"] != paso.numero_orden:
        paso_con_mismo_orden = db.scalar(
            select(PasoReceta).where(
                PasoReceta.receta_id == paso.receta_id,
                PasoReceta.numero_orden == update_data["numero_orden"],
                PasoReceta.id != paso.id,
            )
        )
        if paso_con_mismo_orden:
            raise exceptions.NumeroOrdenPasoDuplicado()
            
    # Validar recursos nuevos
    _validar_recursos_activos(
        db, 
        equipos=update_data.get("equipos"), 
        insumos=update_data.get("insumos")
    )
    
    if "equipos" in update_data:
        nuevos_equipos = update_data.pop("equipos")
        paso.equipos.clear()
        if nuevos_equipos:
            paso.equipos.extend(_filtrar_recursos_unicos(nuevos_equipos, "equipo_id", PasoEquipo))
            
    if "insumos" in update_data:
        nuevos_insumos = update_data.pop("insumos")
        paso.insumos.clear()
        if nuevos_insumos:
            paso.insumos.extend(_filtrar_recursos_unicos(nuevos_insumos, "insumo_id", PasoInsumo))
            
    if update_data:
        for key, value in update_data.items():
            setattr(paso, key, value)
            
    try:
        db.commit()
        db.refresh(paso)
    except IntegrityError:
        db.rollback()
        raise exceptions.NumeroOrdenPasoDuplicado()
        
    return paso


def eliminar_paso(db: Session, paso_id: int) -> None:
    """Borrado físico del paso, ya que la receta se encuentra en estado borrador."""
    paso = obtener_paso_por_id(db, paso_id)
    
    if _estado_actual(paso.receta) != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()
        
    try:
        db.delete(paso)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al eliminar el paso.")
    

# SERVICIO DE CÁLCULO DE COMPOSICIÓN PORCENTUAL

def obtener_composicion_porcentual(db: Session, receta_id: int) -> schemas.ComposicionPorcentualOut:
    receta = obtener_receta_por_id(db, receta_id)

    # 1. Consolidar insumos de todos los pasos (excluyendo envases)
    insumos_map = _consolidar_insumos_receta(receta)

    # 2. Convertir cada insumo a gramos y detectar faltantes
    items_calculados = []
    insumos_sin_eq = []
    peso_total_mezcla_g = 0.0

    for data in insumos_map.values():
        insumo = data["insumo"]
        cant_nom = data["cantidad_nominal"]
        simbolo_u = insumo.unidad_medida.simbolo if insumo.unidad_medida else ""

        masa_g, sin_eq = _convertir_insumo_a_masa(insumo, cant_nom)
        if sin_eq:
            insumos_sin_eq.append(sin_eq)
        else:
            peso_total_mezcla_g += masa_g

        items_calculados.append({
            "insumo_id": insumo.id,
            "nombre": insumo.nombre,
            "categoria": insumo.categoria,
            "cantidad_nominal": cant_nom,
            "unidad_nominal": simbolo_u,
            "masa_equivalente_g": masa_g,
            "porcentaje_mezcla": None,
        })

    es_completa = len(insumos_sin_eq) == 0 and len(items_calculados) > 0 and peso_total_mezcla_g > 0

    # 3. Calcular porcentajes y dividir en ingredientes / aditivos
    ingredientes, aditivos, suma_porcentajes = _calcular_porcentajes_y_grupos(
        items_calculados, peso_total_mezcla_g, es_completa
    )

    verificacion_100 = es_completa and abs(suma_porcentajes - 100.0) <= 0.5

    return schemas.ComposicionPorcentualOut(
        receta_id=receta.id,
        codigo_receta=receta.codigo_receta,
        nombre_receta=receta.nombre_receta,
        estado_receta=receta.estado,
        ingredientes=ingredientes,
        aditivos=aditivos,
        peso_total_mezcla_g=round(peso_total_mezcla_g, 3),
        suma_porcentajes=suma_porcentajes,
        verificacion_100=verificacion_100,
        es_completa=es_completa,
        insumos_sin_equivalencia=insumos_sin_eq,
    )


def _formatear_item_rotulo_caa(insumo: Insumo) -> str:
    """Formatea la denominación de un insumo para el rótulo según CAA Cap. V:
    - Materia prima: denominacion_rotulo (o nombre si está vacía).
    - Aditivo (aromatizante/saborizante): función/clase funcional (ej: 'aromatizante').
    - Aditivo general: '{Clase}: {Denominación} (INS {número})'.
    """
    denom = (insumo.denominacion_rotulo or "").strip() or insumo.nombre
    cat = (insumo.categoria or "").strip().lower()

    if cat != "aditivo":
        return denom

    clase = (insumo.clase_funcional or "").strip()
    clase_lower = clase.lower()
    ins = (insumo.numero_ins or "").strip()

    from src.insumos.constants import Constantes
    if clase_lower in Constantes.CLASES_SIN_INS_OBLIGATORIO:
        return clase.lower() if clase else denom

    clase_titulo = clase.capitalize() if clase else "Aditivo"
    ins_str = f" (INS {ins})" if ins else ""
    return f"{clase_titulo}: {denom}{ins_str}"


def _agrupar_aditivos_por_clase(aditivos: list[dict]) -> list[tuple[str, list[dict]]]:
    """Agrupa aditivos contiguos que comparten la misma clase funcional.
    
    Retorna una lista de tuplas: (nombre_clase, lista_de_aditivos).
    """
    grupos: list[tuple[str, list[dict]]] = []
    for aditivo in aditivos:
        clase = (aditivo.get("clase_funcional") or "").strip()
        if grupos and grupos[-1][0].lower() == clase.lower():
            grupos[-1][1].append(aditivo)
        else:
            grupos.append((clase, [aditivo]))
    return grupos


def _generar_texto_legal_caa(items: list[dict]) -> str:
    """Genera la cadena legal de ingredientes según CAA Cap. V:
    - Materias primas: denominación individual en orden decreciente/manual.
    - Separación con punto (.) entre el último ingrediente y el primer aditivo.
    - Aditivos: agrupados por clase funcional contigua:
      '{Clase}: {Nombre 1} (INS {x}), {Nombre 2} (INS {y})'
      o para aromatizantes/saborizantes: función/denominación.
    """
    from src.insumos.constants import Constantes

    partes_mp: list[str] = [
        it["denominacion_rotulo"] for it in items if it.get("categoria") != "aditivo"
    ]

    aditivos = [it for it in items if it.get("categoria") == "aditivo"]
    grupos_aditivos = _agrupar_aditivos_por_clase(aditivos)

    partes_aditivos: list[str] = []
    for clase, aditivos_grupo in grupos_aditivos:
        clase_lower = clase.lower()
        if clase_lower in Constantes.CLASES_SIN_INS_OBLIGATORIO:
            partes_aditivos.append(clase_lower or "aromatizante")
        else:
            clase_titulo = clase.capitalize() if clase else "Aditivo"
            detalles_aditivos = []
            for ad in aditivos_grupo:
                denom = ad["denominacion_rotulo"]
                ins = (ad.get("numero_ins") or "").strip()
                ins_str = f" (INS {ins})" if ins else ""
                detalles_aditivos.append(f"{denom}{ins_str}")
            partes_aditivos.append(f"{clase_titulo}: {', '.join(detalles_aditivos)}")

    if not partes_mp and not partes_aditivos:
        return ""

    if partes_mp and partes_aditivos:
        texto_mp = ", ".join(partes_mp)
        texto_ad = ", ".join(partes_aditivos)
        return f"Ingredientes: {texto_mp}. {texto_ad}."
    if partes_mp:
        return f"Ingredientes: {', '.join(partes_mp)}."
    return f"Ingredientes: {', '.join(partes_aditivos)}."


def _criterio_orden_materia_prima(item: dict) -> tuple:
    """Criterio CAA para materias primas: porcentaje/masa decreciente, desempate alfabético por denominación y por ID."""
    proporcion = item["porcentaje_mezcla"] if item["porcentaje_mezcla"] is not None else (item["masa_equivalente_g"] or 0.0)
    return (-proporcion, item["denominacion_rotulo"].lower(), item["insumo_id"])


def _criterio_orden_aditivo(item: dict) -> tuple:
    """Criterio CAA para aditivos: agrupados por clase funcional alfabética, luego porcentaje/masa decreciente, desempate por denominación."""
    clase = (item.get("clase_funcional") or "").strip().lower()
    proporcion = item["porcentaje_mezcla"] if item["porcentaje_mezcla"] is not None else (item["masa_equivalente_g"] or 0.0)
    return (clase, -proporcion, item["denominacion_rotulo"].lower(), item["insumo_id"])


def _criterio_orden_manual(item: dict, orden_posiciones: dict[int, int]) -> tuple:
    """Criterio para orden manual: respeta el índice asignado en el JSON de orden manual."""
    posicion = orden_posiciones.get(item["insumo_id"], 999999)
    porcentaje = item["porcentaje_mezcla"] or 0.0
    return (posicion, -porcentaje, item["denominacion_rotulo"].lower())


def _validar_ids_orden_manual(ids_enviados: list[int], ids_esperados: set[int]) -> None:
    """Valida que la lista de IDs coincida exactamente con los insumos presentes en la receta (sin faltantes ni duplicados)."""
    if set(ids_enviados) != ids_esperados or len(ids_enviados) != len(ids_esperados):
        raise exceptions.OrdenManualInsumosInvalidos()


def _validar_frontera_caa(ids_enviados: list[int], insumo_map: dict[int, Insumo]) -> None:
    """Valida la frontera infranqueable (CAA Cap. V): ningún aditivo puede preceder a una materia prima."""
    aditivo_visto = False
    for iid in ids_enviados:
        categoria = (insumo_map[iid].categoria or "").strip().lower()
        if categoria == "aditivo":
            aditivo_visto = True
        elif aditivo_visto:
            raise exceptions.OrdenManualFronteraInvalida()


def _validar_orden_materias_primas(
    ids_enviados: list[int],
    insumo_map: dict[int, Insumo],
    pct_map: dict[int, float],
    masa_map: dict[int, float],
) -> None:
    """Valida orden no creciente en materias primas (solo se permite reordenar materias primas con idéntica proporción)."""
    mp_ids = [iid for iid in ids_enviados if (insumo_map[iid].categoria or "").strip().lower() != "aditivo"]
    for i in range(len(mp_ids) - 1):
        actual_id = mp_ids[i]
        siguiente_id = mp_ids[i + 1]
        pct_act = pct_map[actual_id]
        pct_sig = pct_map[siguiente_id]
        masa_act = masa_map[actual_id]
        masa_sig = masa_map[siguiente_id]

        if (pct_act < pct_sig) or (pct_act == pct_sig and masa_act < masa_sig):
            raise exceptions.OrdenManualProporcionInvalida(
                nombre_actual=insumo_map[actual_id].nombre,
                pct_actual=pct_act,
                nombre_siguiente=insumo_map[siguiente_id].nombre,
                pct_siguiente=pct_sig,
            )


def _validar_agrupacion_aditivos(ids_enviados: list[int], insumo_map: dict[int, Insumo]) -> None:
    """Valida que los aditivos permanezcan agrupados por clase funcional (rechaza fragmentaciones)."""
    aditivo_ids = [iid for iid in ids_enviados if (insumo_map[iid].categoria or "").strip().lower() == "aditivo"]
    clases_vistas: list[str] = []
    clase_anterior: str | None = None

    for iid in aditivo_ids:
        clase = (insumo_map[iid].clase_funcional or "").strip().lower()
        if clase != clase_anterior:
            if clase in clases_vistas:
                nombre_clase = insumo_map[iid].clase_funcional or "aditivo"
                raise exceptions.OrdenManualClasesFragmentadas(nombre_clase=nombre_clase)
            clases_vistas.append(clase)
            clase_anterior = clase


def _calcular_items_declaracion(insumos_map: dict) -> tuple[list[dict], bool, list[str]]:
    """Convierte insumos consolidados a gramos y calcula sus porcentajes de mezcla."""
    items_calculados = []
    insumos_sin_eq = []
    peso_total_mezcla_g = 0.0

    for data in insumos_map.values():
        insumo = data["insumo"]
        cant_nom = data["cantidad_nominal"]

        masa_g, sin_eq = _convertir_insumo_a_masa(insumo, cant_nom)
        if sin_eq:
            insumos_sin_eq.append(sin_eq)
        else:
            peso_total_mezcla_g += masa_g

        items_calculados.append({
            "insumo": insumo,
            "insumo_id": insumo.id,
            "nombre_insumo": insumo.nombre,
            "denominacion_rotulo": (insumo.denominacion_rotulo or "").strip() or insumo.nombre,
            "categoria": (insumo.categoria or "").strip().lower(),
            "clase_funcional": insumo.clase_funcional,
            "numero_ins": insumo.numero_ins,
            "masa_equivalente_g": masa_g,
            "porcentaje_mezcla": None,
            "texto_declaracion": _formatear_item_rotulo_caa(insumo),
        })

    es_completa = len(insumos_sin_eq) == 0 and len(items_calculados) > 0 and peso_total_mezcla_g > 0

    for item in items_calculados:
        if es_completa and item["masa_equivalente_g"] is not None and peso_total_mezcla_g > 0:
            item["porcentaje_mezcla"] = round((item["masa_equivalente_g"] / peso_total_mezcla_g) * 100.0, 2)

    return items_calculados, es_completa, insumos_sin_eq


def _ordenar_items_automatico_caa(items_calculados: list[dict]) -> list[dict]:
    """Ordena materias primas y aditivos según el criterio automático normativo CAA."""
    materias_primas = sorted(
        (it for it in items_calculados if it["categoria"] != "aditivo"),
        key=_criterio_orden_materia_prima,
    )
    aditivos = sorted(
        (it for it in items_calculados if it["categoria"] == "aditivo"),
        key=_criterio_orden_aditivo,
    )
    return materias_primas + aditivos


def obtener_declaracion_ingredientes(db: Session, receta_id: int) -> schemas.DeclaracionIngredientesOut:
    receta = obtener_receta_por_id(db, receta_id)

    # 1. Consolidar insumos de la receta (excluyendo envases)
    insumos_map = _consolidar_insumos_receta(receta)

    # 2 y 3. Convertir insumos a gramos y calcular porcentajes
    items_calculados, es_completa, insumos_sin_eq = _calcular_items_declaracion(insumos_map)

    # 4. Ordenamiento
    if receta.es_orden_manual and receta.orden_manual_json:
        # Orden manual guardado en orden_manual_json
        orden_dict = {iid: idx for idx, iid in enumerate(receta.orden_manual_json)}
        items_calculados.sort(key=lambda x: _criterio_orden_manual(x, orden_dict))
        items_finales = items_calculados
    else:
        items_finales = _ordenar_items_automatico_caa(items_calculados)

    # 5. Asignar posiciones y estructurar salida
    items_out = []
    for idx, it in enumerate(items_finales, start=1):
        items_out.append(schemas.ItemDeclaracionIngredienteOut(
            posicion=idx,
            insumo_id=it["insumo_id"],
            nombre_insumo=it["nombre_insumo"],
            denominacion_rotulo=it["denominacion_rotulo"],
            categoria=it["categoria"],
            clase_funcional=it["clase_funcional"],
            numero_ins=it["numero_ins"],
            masa_equivalente_g=it["masa_equivalente_g"],
            porcentaje_mezcla=it["porcentaje_mezcla"],
            texto_declaracion=it["texto_declaracion"],
        ))

    texto_legal_rotulo = _generar_texto_legal_caa(items_finales)

    from src.rotulado_producto.services import (
        _consolidar_alergenos_receta,
        generar_leyenda_alergenos_caa,
    )

    alergenos_receta, _ = _consolidar_alergenos_receta(receta)
    leyenda_alergenos_caa = generar_leyenda_alergenos_caa(alergenos_receta, [])

    return schemas.DeclaracionIngredientesOut(
        receta_id=receta.id,
        codigo_receta=receta.codigo_receta,
        nombre_receta=receta.nombre_receta,
        es_orden_manual=bool(receta.es_orden_manual),
        es_completa=es_completa,
        insumos_sin_equivalencia=insumos_sin_eq,
        items=items_out,
        texto_legal_rotulo=texto_legal_rotulo,
        leyenda_alergenos_caa=leyenda_alergenos_caa,
    )


def guardar_orden_manual_declaracion(
    db: Session,
    receta_id: int,
    payload: schemas.OrdenManualDeclaracionIn,
) -> schemas.DeclaracionIngredientesOut:
    receta = obtener_receta_por_id(db, receta_id)

    # 1. Consolidar insumos de la receta y verificar integridad de IDs
    insumos_receta = _consolidar_insumos_receta(receta)
    receta_insumo_ids = set(insumos_receta.keys())
    ids_enviados = payload.insumo_ids_ordenados

    _validar_ids_orden_manual(ids_enviados, receta_insumo_ids)

    # 2. Calcular mapa de masas y porcentajes
    insumo_map = {iid: data["insumo"] for iid, data in insumos_receta.items()}
    masa_map = {}
    peso_total_mezcla_g = 0.0

    for iid, data in insumos_receta.items():
        masa_g, _ = _convertir_insumo_a_masa(data["insumo"], data["cantidad_nominal"])
        valor_masa = masa_g if masa_g is not None else 0.0
        masa_map[iid] = valor_masa
        peso_total_mezcla_g += valor_masa

    pct_map = {
        iid: round((masa_map[iid] / peso_total_mezcla_g) * 100.0, 2) if peso_total_mezcla_g > 0 else 0.0
        for iid in receta_insumo_ids
    }

    # 3. Validaciones normativas CAA Cap. V
    _validar_frontera_caa(ids_enviados, insumo_map)
    _validar_orden_materias_primas(ids_enviados, insumo_map, pct_map, masa_map)
    _validar_agrupacion_aditivos(ids_enviados, insumo_map)

    # 4. Persistir orden manual (si coincide exactamente con el orden automático CAA, se vuelve a automático)
    items_calculados, _, _ = _calcular_items_declaracion(insumos_receta)
    ids_automaticos = [it["insumo_id"] for it in _ordenar_items_automatico_caa(items_calculados)]

    if ids_enviados == ids_automaticos:
        receta.es_orden_manual = False
        receta.orden_manual_json = None
    else:
        receta.es_orden_manual = True
        receta.orden_manual_json = payload.insumo_ids_ordenados
    try:
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return obtener_declaracion_ingredientes(db, receta_id)


def restablecer_orden_automatico_declaracion(db: Session, receta_id: int) -> schemas.DeclaracionIngredientesOut:
    receta = obtener_receta_por_id(db, receta_id)
    receta.es_orden_manual = False
    receta.orden_manual_json = None
    try:
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return obtener_declaracion_ingredientes(db, receta_id)


# --- CÁLCULO DE INFORMACIÓN NUTRICIONAL DE LA RECETA ---


def _obtener_campos_faltantes_insumo(insumo: Insumo) -> list[str]:
    """Devuelve las etiquetas de los nutrientes obligatorios nulos según la categoría del insumo."""
    cat = (insumo.categoria or "").strip().lower()
    if cat == "materia prima":
        # Las materias primas requieren los 10 nutrientes declarables completos
        campos_requeridos = InsumoConstantes.CAMPOS_NUTRIENTES_COMPLETOS
    else:
        # Aditivos y otros requieren al menos energía y sodio
        campos_requeridos = NutricionConstantes.CAMPOS_MINIMOS_ADITIVO

    return [
        NutricionConstantes.ETIQUETAS_CAMPOS_INSUMO.get(campo, campo)
        for campo in campos_requeridos
        if getattr(insumo, campo) is None
    ]


def _redondear_normativo(valor: float, decimales: int) -> float:
    """Redondea usando ROUND_HALF_UP a la cantidad de decimales configurada en la BD."""
    cuantizador = Decimal("1") if decimales <= 0 else Decimal(f"1e-{decimales}")
    redondeado = Decimal(str(valor)).quantize(cuantizador, rounding=ROUND_HALF_UP)
    return float(redondeado)


def _formatear_numero_es(valor: float, decimales: int) -> str:
    """Formatea el número con coma decimal para presentación en la tabla nutricional."""
    if decimales <= 0:
        return str(int(round(valor)))
    return f"{valor:.{decimales}f}".replace(".", ",")


def _formatear_celda_nutriente(
    valor: float,
    param,
) -> tuple[float, str, Optional[float], bool]:
    """Aplica redondeo normativo, umbral de no significativo y conversión kJ según ParametroNutricional.

    Retorna: (valor_redondeado, texto_formateado, valor_kj, es_no_significativo).
    """
    umbral = float(param.umbral_no_significativo) if param.umbral_no_significativo is not None else None
    es_no_sig = umbral is not None and valor <= umbral

    # 1. Si el valor no supera el umbral configurado en BD, se expresa con el texto no significativo
    if es_no_sig:
        texto_no_sig = (param.texto_no_significativo or NutricionConstantes.TEXTO_NO_SIG_CERO).strip()
        if param.codigo_nutriente == NutricionConstantes.CODIGO_VALOR_ENERGETICO:
            if texto_no_sig == NutricionConstantes.TEXTO_NO_SIG_CERO:
                return 0.0, "0 kcal = 0 kJ", 0.0, True
            return 0.0, texto_no_sig, 0.0, True
        if texto_no_sig == NutricionConstantes.TEXTO_NO_SIG_CERO:
            return 0.0, f"0 {param.unidad}", None, True
        return 0.0, texto_no_sig, None, True

    # 2. Redondeo a las cifras decimales configuradas para este nutriente
    valor_red = _redondear_normativo(valor, param.decimales)
    valor_str = _formatear_numero_es(valor_red, param.decimales)

    # 3. Para valor energético, se calcula su equivalente en kJ con el factor de la BD
    if param.codigo_nutriente == NutricionConstantes.CODIGO_VALOR_ENERGETICO:
        factor_kj = (
            float(param.factor_conversion_kj)
            if param.factor_conversion_kj is not None
            else NutricionConstantes.FACTOR_CONVERSION_KJ_DEFECTO
        )
        valor_kj = _redondear_normativo(valor_red * factor_kj, 0)
        return valor_red, f"{valor_str} kcal = {int(valor_kj)} kJ", valor_kj, False

    return valor_red, f"{valor_str} {param.unidad}", None, False


def obtener_informacion_nutricional(db: Session, receta_id: int) -> schemas.InformacionNutricionalOut:
    """Calcula la información nutricional por 100 g, por porción y % VD según parámetros normativos."""
    receta = obtener_receta_por_id(db, receta_id)
    # Se leen los 10 parámetros normativos (VDR, decimales, umbrales, factor kJ) desde la BD
    parametros = listar_parametros_nutricionales(db)
    # Se consolidan las cantidades de cada insumo sumando todos los pasos (excluyendo envases)
    insumos_receta = _consolidar_insumos_receta(receta)

    insumos_sin_equivalencia: list[schemas.InsumoSinEquivalenciaOut] = []
    insumos_pendientes: list[schemas.InsumoNutricionPendienteOut] = []
    masas_por_insumo: list[tuple[Insumo, float]] = []

    # Paso 1: Convertir cada insumo a gramos y verificar que sus datos nutricionales estén completos
    for data in insumos_receta.values():
        insumo: Insumo = data["insumo"]
        cant_nom: float = data["cantidad_nominal"]

        masa_g, sin_eq = _convertir_insumo_a_masa(insumo, cant_nom)
        if sin_eq is not None:
            insumos_sin_equivalencia.append(sin_eq)
        elif masa_g is not None:
            masas_por_insumo.append((insumo, masa_g))

        if not insumo.nutricion_completa:
            faltantes = _obtener_campos_faltantes_insumo(insumo)
            insumos_pendientes.append(
                schemas.InsumoNutricionPendienteOut(
                    insumo_id=insumo.id,
                    nombre=insumo.nombre,
                    categoria=insumo.categoria,
                    campos_faltantes=faltantes,
                    mensaje=(
                        f"El insumo '{insumo.nombre}' tiene datos nutricionales en estado Pendiente "
                        f"(faltan: {', '.join(faltantes)})."
                    ),
                )
            )

    # Paso 2: Guardas de negocio (no se calcula sobre ceros falsos si faltan datos o equivalencias)
    rendimiento_g = float(receta.rendimiento_estandar)
    tamano_porcion_g = float(receta.tamano_porcion) if receta.tamano_porcion is not None else None
    tiene_porcion = tamano_porcion_g is not None and tamano_porcion_g > 0
    es_calculable = (
        len(masas_por_insumo) > 0
        and len(insumos_sin_equivalencia) == 0
        and len(insumos_pendientes) == 0
        and rendimiento_g > 0
    )

    # Paso 3: Construcción de la leyenda reglamentaria a partir del VDR energético de la BD
    param_energia = next(
        (p for p in parametros if p.codigo_nutriente == NutricionConstantes.CODIGO_VALOR_ENERGETICO),
        None,
    )
    vdr_kcal = (
        int(round(float(param_energia.vdr)))
        if param_energia and param_energia.vdr is not None
        else NutricionConstantes.VDR_ENERGIA_ESTANDAR_KCAL
    )
    factor_kj_leyenda = (
        float(param_energia.factor_conversion_kj)
        if param_energia and param_energia.factor_conversion_kj is not None
        else NutricionConstantes.FACTOR_CONVERSION_KJ_DEFECTO
    )
    # Para la dieta estándar de 2000 kcal, la normativa CAA / Mercosur fija textualmente 8.400 kJ
    vdr_kj = (
        NutricionConstantes.VDR_ENERGIA_ESTANDAR_KJ
        if vdr_kcal == NutricionConstantes.VDR_ENERGIA_ESTANDAR_KCAL
        else int(round(vdr_kcal * factor_kj_leyenda))
    )
    leyenda_vd = NutricionConstantes.PLANTILLA_LEYENDA_VD.format(
        kcal=f"{vdr_kcal:,}".replace(",", "."),
        kj=f"{vdr_kj:,}".replace(",", "."),
    )

    # Paso 4: Cálculo ponderado nutriente por nutriente
    filas: list[schemas.FilaNutrienteCalculadoOut] = []
    for param in parametros:
        campo_insumo = NutricionConstantes.MAPA_PARAMETRO_A_CAMPO_INSUMO.get(param.codigo_nutriente)
        lleva_vd = param.permite_vdr and param.vdr is not None

        if not es_calculable or not campo_insumo:
            filas.append(
                schemas.FilaNutrienteCalculadoOut(
                    codigo_nutriente=param.codigo_nutriente,
                    nombre_etiqueta=param.nombre_etiqueta,
                    unidad=param.unidad,
                    orden=param.orden,
                    nivel_indentacion=param.nivel_indentacion,
                    lleva_vd=lleva_vd,
                )
            )
            continue

        # 4.1 Aporte total en la tanda: suma de (masa_g / 100 g) * nutriente_por_100g_del_insumo
        aporte_total = sum(
            (masa_g / NutricionConstantes.BASE_NUTRIENTE_INSUMO_G) * float(getattr(insumo, campo_insumo) or 0.0)
            for insumo, masa_g in masas_por_insumo
        )
        # 4.2 Normalización a 100 g de producto terminado usando el rendimiento estándar en gramos
        nutriente_100g = (aporte_total / rendimiento_g) * NutricionConstantes.BASE_PRODUCTO_TERMINADO_G
        val_100g, fmt_100g, kj_100g, _ = _formatear_celda_nutriente(nutriente_100g, param)

        val_porcion: Optional[float] = None
        fmt_porcion: Optional[str] = None
        kj_porcion: Optional[float] = None
        porcentaje_vd: Optional[int] = None
        es_no_sig_porcion = False

        # 4.3 Escalado a tamaño de porción y cálculo de % VD si la receta tiene porción definida
        if tiene_porcion and tamano_porcion_g is not None:
            nutriente_porcion = nutriente_100g * (tamano_porcion_g / NutricionConstantes.BASE_PRODUCTO_TERMINADO_G)
            val_porcion, fmt_porcion, kj_porcion, es_no_sig_porcion = _formatear_celda_nutriente(
                nutriente_porcion, param
            )
            if lleva_vd and param.vdr is not None and float(param.vdr) > 0:
                if es_no_sig_porcion:
                    porcentaje_vd = 0
                else:
                    porcentaje_vd = int(round((val_porcion / float(param.vdr)) * 100.0))

        filas.append(
            schemas.FilaNutrienteCalculadoOut(
                codigo_nutriente=param.codigo_nutriente,
                nombre_etiqueta=param.nombre_etiqueta,
                unidad=param.unidad,
                orden=param.orden,
                nivel_indentacion=param.nivel_indentacion,
                valor_100g=val_100g,
                valor_100g_formateado=fmt_100g,
                valor_100g_kj=kj_100g,
                valor_porcion=val_porcion,
                valor_porcion_formateado=fmt_porcion,
                valor_porcion_kj=kj_porcion,
                porcentaje_vd=porcentaje_vd,
                lleva_vd=lleva_vd,
                es_no_significativo_porcion=es_no_sig_porcion,
            )
        )

    return schemas.InformacionNutricionalOut(
        receta_id=receta.id,
        codigo_receta=receta.codigo_receta,
        nombre_receta=receta.nombre_receta,
        rendimiento_estandar_g=rendimiento_g,
        tamano_porcion_g=tamano_porcion_g,
        es_calculable=es_calculable,
        tiene_porcion=tiene_porcion,
        insumos_sin_equivalencia=insumos_sin_equivalencia,
        insumos_nutricion_pendiente=insumos_pendientes,
        filas=filas,
        leyenda_vd=leyenda_vd,
    )

