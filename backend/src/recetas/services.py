from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.personal import exceptions as personal_exceptions
from src.personal.models import Persona
from src.recetas import exceptions, schemas
from src.recetas.constants import EstadoReceta, TipoRecurso
from src.recetas.models import Receta, PasoReceta, PasoEquipo, PasoInsumo
from src.equipos.models import Equipo
from src.insumos.models import Insumo 

# --- FUNCIONES AUXILIARES ---

def _validar_usuario_creador(db: Session, usuario_id: int) -> Persona:
    """Valida que la persona que crea/clona la receta exista y esté activa."""
    usuario = db.scalar(select(Persona).where(Persona.id == usuario_id))
    if not usuario:
        raise personal_exceptions.PersonaNoEncontrada()
    if not usuario.activo:
        raise personal_exceptions.PersonaInactiva()
    return usuario


def _generar_codigo_receta(db: Session) -> str:
    recetas = db.scalars(select(Receta.codigo_receta).order_by(Receta.id.desc())).all()
    ultimo_numero = 0
    for codigo in recetas:
        if codigo and codigo.startswith("REC-"):
            try:
                parte = codigo.split("-")[1]
                if parte.isdigit():
                    num = int(parte)
                    if num > ultimo_numero:
                        ultimo_numero = num
                    break
            except Exception:
                continue
    nuevo_numero = ultimo_numero + 1
    return f"REC-{nuevo_numero:03d}"


def _estado_actual(receta: Receta) -> str:
    return receta.estado.value if hasattr(receta.estado, "value") else receta.estado


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


# --- SERVICIOS DE RECETA ---

def obtener_receta_por_id(db: Session, receta_id: int) -> Receta:
    receta = db.scalar(
        select(Receta)
        .options(joinedload(Receta.usuario_creador))
        .where(Receta.id == receta_id)
    )
    if not receta:
        raise exceptions.RecetaNoEncontrada()
    return receta


def listar_recetas(db: Session) -> List[Receta]:
    return list(
        db.scalars(
            select(Receta)
            .options(joinedload(Receta.usuario_creador))
            .order_by(Receta.fecha_creacion.desc())
        ).all()
    )


def obtener_receta_borrador(db: Session) -> Optional[Receta]:
    return db.scalar(
        select(Receta)
        .options(joinedload(Receta.usuario_creador))
        .where(Receta.estado == EstadoReceta.BORRADOR)
        .order_by(Receta.fecha_creacion.desc())
    )


def obtener_recetas_activas(db: Session) -> List[Receta]:
    return list(
        db.scalars(
            select(Receta)
            .options(joinedload(Receta.usuario_creador))
            .where(Receta.estado == EstadoReceta.ACTIVA)
        ).all()
    )


def crear_receta_borrador(db: Session, receta: schemas.RecetaCreate, usuario_id: int) -> Receta:
    _validar_usuario_creador(db, usuario_id)

    codigo_receta = _generar_codigo_receta(db)

    nueva_receta = Receta(
        codigo_receta=codigo_receta,
        nombre_receta=receta.nombre_receta,
        producto_id=receta.producto_id,
        rendimiento_estandar=receta.rendimiento_estandar,
        tiempo_estimado_total=receta.tiempo_estimado_total,
        estado=EstadoReceta.BORRADOR,
        observaciones=receta.observaciones,
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
    if estado_actual == EstadoReceta.INHABILITADA.value:
        raise exceptions.RecetaInhabilitadaNoEditable()
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
    """Pasa un borrador a estado ACTIVA, inhabilitando la receta activa anterior de ese producto (si existía)."""
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.BORRADOR.value:
        raise exceptions.RecetaNoEsBorrador()

    # Validación 1: Debe tener pasos
    if not receta.pasos:
        raise exceptions.RecetaSinPasos()

    # Validación 2: Todos los recursos usados en los pasos deben estar activos
    for paso in receta.pasos:
        _validar_recursos_activos(db, equipos=paso.equipos, insumos=paso.insumos)

    try:
        # Si ya había una receta ACTIVA para este mismo producto, pasa a INHABILITADA
        receta_vigente = db.scalar(
            select(Receta).where(
                Receta.producto_id == receta.producto_id,
                Receta.estado == EstadoReceta.ACTIVA,
            )
        )
        if receta_vigente:
            receta_vigente.estado = EstadoReceta.INHABILITADA

        receta.estado = EstadoReceta.ACTIVA
        db.commit()
        db.refresh(receta)
    except IntegrityError:
        db.rollback()
        raise exceptions.RecetaNoEditable()

    return receta


def inhabilitar_receta(db: Session, receta_id: int) -> Receta:
    receta = obtener_receta_por_id(db, receta_id)

    estado_actual = _estado_actual(receta)
    if estado_actual != EstadoReceta.ACTIVA.value:
        raise exceptions.RecetaNoActiva()

    receta.estado = EstadoReceta.INHABILITADA
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
    
    nueva_receta = Receta(
        codigo_receta=_generar_codigo_receta(db),
        nombre_receta=origen.nombre_receta,
        producto_id=origen.producto_id,
        rendimiento_estandar=origen.rendimiento_estandar,
        tiempo_estimado_total=origen.tiempo_estimado_total,
        estado=EstadoReceta.BORRADOR,
        observaciones=origen.observaciones,
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