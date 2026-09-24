from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import exc

from src.plan_poes.models import PlanPOES, TareaPOES, TareaInsumoQuimico, TareaElementoLimpieza
from src.plan_poes import schemas, exceptions
from src.plan_poes.constants import TipoRecurso
from src.personal.models import Persona
from src.equipos.models import Equipo
from src.sectores.models import Sector
from src.insumo_quimico.models import InsumoQuimico
from src.elementos_limpieza.models import ElementoLimpieza
from src.personal import exceptions as personal_exceptions

def _validar_autor(db: Session, persona_id: int):
    """Valida que la persona que elabora el plan exista y esté activa."""
    autor = db.scalar(select(Persona).where(Persona.id == persona_id))
    if not autor:
        raise personal_exceptions.PersonaNoEncontrada()
    if not autor.activo:
        raise personal_exceptions.PersonaInactiva()
    
def _clonar_tarea(tarea_antigua: TareaPOES) -> TareaPOES:
    """Recibe una tarea antigua y devuelve una instancia nueva con sus insumos y elementos copiados."""
    return TareaPOES(
        nombre=tarea_antigua.nombre,
        tipo_poes=tarea_antigua.tipo_poes,
        frecuencia=tarea_antigua.frecuencia,
        detalle_frecuencia=tarea_antigua.detalle_frecuencia,
        equipo_id=tarea_antigua.equipo_id,
        sector_id=tarea_antigua.sector_id,
        metodo=tarea_antigua.metodo,
        activo=True,
        insumos_quimicos=[
            TareaInsumoQuimico(
                insumo_quimico_id=i.insumo_quimico_id,
                dosis_sugerida=i.dosis_sugerida,
                dilucion_especifica=i.dilucion_especifica
            ) for i in tarea_antigua.insumos_quimicos
        ],
        elementos_limpieza=[
            TareaElementoLimpieza(
                elemento_limpieza_id=e.elemento_limpieza_id,
                cantidad_requerida=e.cantidad_requerida
            ) for e in tarea_antigua.elementos_limpieza
        ]
    )
    
def _validar_recursos_activos(
    db: Session, 
    equipo_id: Optional[int] = None, 
    sector_id: Optional[int] = None, 
    insumos: Optional[list] = None, 
    elementos: Optional[list] = None
):
    """Valida recursos y asegura la compatibilidad de sectores y equipos cruzados."""
    tarea_sector_id = None
    tarea_equipo_id = equipo_id

    # Se determina el contexto exacto de la tarea
    if equipo_id:
        equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
        if not equipo or not equipo.activo:
            raise exceptions.RecursoInactivo(tipo_recurso=TipoRecurso.EQUIPO, recurso_id=equipo_id)
        tarea_sector_id = equipo.sector_id 
            
    if sector_id:
        sector = db.scalar(select(Sector).where(Sector.id == sector_id))
        if not sector or not sector.activo:
            raise exceptions.RecursoInactivo(tipo_recurso=TipoRecurso.SECTOR, recurso_id=sector_id)
        tarea_sector_id = sector.id

    # Closure para evaluar compatibilidad (Universal, por Equipo o por Sector)
    def es_recurso_compatible(recurso_db) -> bool:
        if getattr(recurso_db, 'sector_id', None) is None and getattr(recurso_db, 'equipo_id', None) is None:
            return True
        if getattr(recurso_db, 'equipo_id', None) is not None:
            return recurso_db.equipo_id == tarea_equipo_id
        if getattr(recurso_db, 'sector_id', None) is not None:
            return recurso_db.sector_id == tarea_sector_id
        return False

    # Se validan Insumos Químicos
    if insumos:
        for insumo in insumos:
            insumo_id = insumo.get("insumo_quimico_id") if isinstance(insumo, dict) else insumo.insumo_quimico_id
            ins_db = db.scalar(select(InsumoQuimico).where(InsumoQuimico.id == insumo_id))
            
            if not ins_db or not ins_db.activo:
                raise exceptions.RecursoInactivo(tipo_recurso=TipoRecurso.INSUMO_QUIMICO, recurso_id=insumo_id)
                
            if not es_recurso_compatible(ins_db):
                raise exceptions.RecursoIncompatible(tipo_recurso=TipoRecurso.INSUMO_QUIMICO, recurso_id=insumo_id)

    # Se validan Elementos de Limpieza
    if elementos:
        for elemento in elementos:
            elemento_id = elemento.get("elemento_limpieza_id") if isinstance(elemento, dict) else elemento.elemento_limpieza_id
            elem_db = db.scalar(select(ElementoLimpieza).where(ElementoLimpieza.id == elemento_id))
            
            if not elem_db or not elem_db.activo:
                raise exceptions.RecursoInactivo(tipo_recurso=TipoRecurso.ELEMENTO_LIMPIEZA, recurso_id=elemento_id)
            
            if not es_recurso_compatible(elem_db):
                raise exceptions.RecursoIncompatible(tipo_recurso=TipoRecurso.ELEMENTO_LIMPIEZA, recurso_id=elemento_id)

# SERVICIOS DE PLAN POES

def obtener_plan_activo(db: Session) -> Optional[PlanPOES]:
    """Retorna el plan vigente (activo = True)."""
    return db.scalar(select(PlanPOES).where(PlanPOES.activo == True))

def obtener_plan_borrador(db: Session) -> Optional[PlanPOES]:
    """Retorna el plan en preparación (activo = False, fecha_hasta = None)."""
    return db.scalar(select(PlanPOES).where(
        PlanPOES.activo == False, 
        PlanPOES.fecha_hasta.is_(None)
    ))
    
def obtener_plan_por_id(db: Session, plan_id: int) -> PlanPOES:
    """Retorna un plan específico o lanza 404."""
    db_plan = db.scalar(select(PlanPOES).where(PlanPOES.id == plan_id))
    if not db_plan:
        raise exceptions.PlanPOESNoEncontrado()
    return db_plan

def listar_planes(db: Session) -> List[PlanPOES]:
    """Lista todos los planes ordenados del más reciente al más antiguo."""
    # Ordenamos por ID descendente ya que el borrador no tiene fecha_emision
    return list(db.scalars(select(PlanPOES).order_by(PlanPOES.id.desc())).all())

def crear_plan_borrador(db: Session, plan: schemas.PlanPOESCreate) -> PlanPOES:
    """Crea un nuevo borrador. Solo puede haber uno a la vez."""
    if obtener_plan_borrador(db):
        raise exceptions.BorradorYaExistente()

    _validar_autor(db, plan.elaborado_por_id)

    nuevo_plan = PlanPOES(
        nombre=plan.nombre,
        objetivo=plan.objetivo,
        elaborado_por_id=plan.elaborado_por_id,
        fecha_emision=None,  # El borrador nace sin fecha de emisión
        activo=False         # El borrador nace inactivo
    )
    
    db.add(nuevo_plan)
    
    try:
        db.commit()
        db.refresh(nuevo_plan)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al crear el plan borrador.")
        
    return nuevo_plan

def modificar_plan(db: Session, plan_id: int, plan: schemas.PlanPOESUpdate) -> PlanPOES:
    """Modifica la carátula de un plan Borrador o Activo. Rechaza los Históricos."""
    db_plan = obtener_plan_por_id(db, plan_id)
    
    # Solo editable si NO tiene fecha_hasta (Borrador o Activo)
    if db_plan.fecha_hasta is not None:
        raise exceptions.PlanArchivadoNoEditable()

    update_data = plan.model_dump(exclude_unset=True)
    if update_data:
        db.execute(update(PlanPOES).where(PlanPOES.id == plan_id).values(**update_data))
        
        try:
            db.commit()
            db.refresh(db_plan)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(detail="Error de integridad al actualizar el plan.")
            
    return db_plan

def activar_plan(db: Session, plan_id: int) -> PlanPOES:
    """Pasa el borrador a activo, sella su fecha de emisión, y archiva el plan anterior."""
    plan_borrador = obtener_plan_por_id(db, plan_id)
    
    es_borrador = (plan_borrador.activo == False and plan_borrador.fecha_hasta is None)
    if not es_borrador:
        raise exceptions.PlanNoEsBorrador()
        
    if not plan_borrador.tareas:
        raise exceptions.PlanSinTareas()

    # Transacción Atómica
    try:
        # Archivar el plan vigente (si existe)
        plan_vigente = obtener_plan_activo(db)
        if plan_vigente:
            plan_vigente.activo = False
            plan_vigente.fecha_hasta = datetime.now()

        # Activar el borrador y sellar su fecha
        plan_borrador.activo = True
        plan_borrador.fecha_emision = datetime.now()

        db.commit()
        db.refresh(plan_borrador)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al intentar activar el plan.")
        
    return plan_borrador

def descartar_borrador(db: Session, plan_id: int) -> None:
    """Elimina físicamente el borrador (nunca tuvo vigencia ni registros)."""
    plan_borrador = obtener_plan_por_id(db, plan_id)
    
    es_borrador = (plan_borrador.activo == False and plan_borrador.fecha_hasta is None)
    if not es_borrador:
        raise exceptions.PlanNoEsBorrador()

    try:
        db.delete(plan_borrador)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al intentar descartar el borrador.")

def archivar_plan(db: Session, plan_id: int) -> PlanPOES:
    """Da de baja lógica un plan vigente sin reemplazarlo por uno nuevo."""
    plan_activo = obtener_plan_por_id(db, plan_id)
    
    if not plan_activo.activo:
        raise exceptions.PlanNoActivo()

    plan_activo.activo = False
    plan_activo.fecha_hasta = datetime.now()
    
    try:
        db.commit()
        db.refresh(plan_activo)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al intentar archivar el plan.")
    
    return plan_activo

def clonar_plan_historico(db: Session, plan_id: int, elaborado_por_id: int) -> PlanPOES:
    """Copia la estructura de un plan archivado y genera un nuevo borrador."""
    plan_historico = obtener_plan_por_id(db, plan_id)
    
    es_historico = (plan_historico.activo == False and plan_historico.fecha_hasta is not None)
    if not es_historico:
         raise exceptions.PlanNoArchivado()
         
    if obtener_plan_borrador(db):
        raise exceptions.BorradorYaExistente()
        
    _validar_autor(db, elaborado_por_id)
    
    # Se filtran las tareas activas y se valida que sus recursos sigan activos HOY
    tareas_activas = [t for t in plan_historico.tareas if t.activo]
    for tarea in tareas_activas:
        _validar_recursos_activos(
            db=db,
            equipo_id=tarea.equipo_id,
            sector_id=tarea.sector_id,
            insumos=tarea.insumos_quimicos,
            elementos=tarea.elementos_limpieza
        )
    
    # Se crea el plan inyectándole las tareas copiadas directamente
    nuevo_borrador = PlanPOES(
        nombre=plan_historico.nombre,
        objetivo=plan_historico.objetivo,
        elaborado_por_id=elaborado_por_id,
        fecha_emision=None,
        activo=False,
        tareas=[_clonar_tarea(t) for t in tareas_activas]
    )
    
    db.add(nuevo_borrador)

    try:
        db.commit()
        db.refresh(nuevo_borrador)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al clonar el plan histórico.")
        
    return nuevo_borrador


# SERVICIOS DE TAREAS POES

def obtener_tarea_por_id(db: Session, tarea_id: int) -> TareaPOES:
    """Busca una tarea específica. Lanza excepción si no existe."""
    tarea = db.scalar(select(TareaPOES).where(TareaPOES.id == tarea_id))
    if not tarea:
        raise exceptions.TareaNoEncontrada()
    return tarea

def listar_tareas_por_plan(db: Session, plan_id: int) -> List[TareaPOES]:
    """Devuelve todas las tareas ACTIVAS asociadas a un plan específico."""
    # Opcionalmente podrías validar primero si el plan_id existe
    return list(db.scalars(
        select(TareaPOES)
        .where(TareaPOES.plan_id == plan_id, TareaPOES.activo == True)
        .order_by(TareaPOES.id.asc())
    ).all())
    
def agregar_tarea_a_plan(db: Session, plan_id: int, tarea: schemas.TareaPOESCreate) -> TareaPOES:
    """Añade una nueva tarea a un plan Borrador o Activo."""
    # Se valida que el plan exista y se pueda editar
    plan = obtener_plan_por_id(db, plan_id)
    if plan.fecha_hasta is not None:
        raise exceptions.PlanArchivadoNoEditable()

    # Se valida que los recursos (equipo, sector, insumos, etc) estén activos en la base
    _validar_recursos_activos(
        db=db,
        equipo_id=tarea.equipo_id,
        sector_id=tarea.sector_id,
        insumos=tarea.insumos_quimicos,
        elementos=tarea.elementos_limpieza
    )

    # Se construye la tarea y sus relaciones en memoria
    nueva_tarea = TareaPOES(
        plan_id=plan.id,
        nombre=tarea.nombre,
        tipo_poes=tarea.tipo_poes,
        frecuencia=tarea.frecuencia,
        detalle_frecuencia=tarea.detalle_frecuencia,
        equipo_id=tarea.equipo_id,
        sector_id=tarea.sector_id,
        metodo=tarea.metodo,
        activo=True,
        insumos_quimicos=[
            TareaInsumoQuimico(**i.model_dump()) for i in tarea.insumos_quimicos
        ],
        elementos_limpieza=[
            TareaElementoLimpieza(**e.model_dump()) for e in tarea.elementos_limpieza
        ]
    )

    db.add(nueva_tarea)
    try:
        db.commit()
        db.refresh(nueva_tarea)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al agregar la tarea al plan.")
    return nueva_tarea

def modificar_tarea(db: Session, tarea_id: int, tarea_update: schemas.TareaPOESUpdate) -> TareaPOES:
    """Actualiza una tarea. Permite modificar relaciones enviando las listas completas."""
    tarea = obtener_tarea_por_id(db, tarea_id)

    if tarea.plan.fecha_hasta is not None:
        raise exceptions.PlanArchivadoNoEditable()

    update_data = tarea_update.model_dump(exclude_unset=True)
    
    if not tarea.activo:
        # Si la tarea está inactiva, SOLO se puede reactivar
        if update_data != {"activo": True}:
            raise exceptions.TareaInactiva()
    else:
        # Se bloquea la baja por PATCH.
        if update_data.get("activo") is False:
            raise exceptions.BajaPorPatchNoPermitida()

    # Se valida que solo uno de los dos campos (equipo_id o sector_id) esté presente
    nuevo_equipo = update_data.get("equipo_id", tarea.equipo_id)
    nuevo_sector = update_data.get("sector_id", tarea.sector_id)
    
    if "equipo_id" in update_data or "sector_id" in update_data:
        if bool(nuevo_equipo) == bool(nuevo_sector):
            raise exceptions.TareaAsignacionInvalida()

    # Se valida la frecuencia y si corresponde el detalle_frecuencia según la nueva frecuencia
    nueva_freq = update_data.get("frecuencia", tarea.frecuencia)
    nuevo_detalle = update_data.get("detalle_frecuencia", tarea.detalle_frecuencia)
    
    if nueva_freq == "diaria" and nuevo_detalle is not None:
        update_data["detalle_frecuencia"] = None
    elif nueva_freq != "diaria" and not nuevo_detalle:
        raise exceptions.FrecuenciaInvalida(motivo=f"La frecuencia '{nueva_freq}' requiere obligatoriamente que se envíe un detalle_frecuencia.")
    
    # Se valida que los recursos estén activos (solo para los que se estén actualizando)
    _validar_recursos_activos(
        db=db,
        equipo_id=update_data.get("equipo_id"),
        sector_id=update_data.get("sector_id"),
        insumos=update_data.get("insumos_quimicos"),
        elementos=update_data.get("elementos_limpieza")
    )

    # Se reemplazan los Insumos Químicos
    if "insumos_quimicos" in update_data:
        nuevos_insumos = update_data.pop("insumos_quimicos")
        tarea.insumos_quimicos.clear() # Aca se aplica lo de cascade="all, delete-orphan" en el modelo
        if nuevos_insumos:
            for i in nuevos_insumos:
                tarea.insumos_quimicos.append(TareaInsumoQuimico(**i))

    # Se reemplazan los Elementos de Limpieza
    if "elementos_limpieza" in update_data:
        nuevos_elementos = update_data.pop("elementos_limpieza")
        tarea.elementos_limpieza.clear()
        if nuevos_elementos:
            for e in nuevos_elementos:
                tarea.elementos_limpieza.append(TareaElementoLimpieza(**e))

    # Se valida que la tarea no haya quedado sin recursos tras la edición
    if not tarea.insumos_quimicos and not tarea.elementos_limpieza:
        raise exceptions.TareaSinRecursos()

    # Se actualian los campos simples (metodo, frecuencia, etc)
    if update_data:
        for key, value in update_data.items():
            setattr(tarea, key, value)

    try:
        db.commit()
        db.refresh(tarea)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al modificar la tarea.")
    return tarea

def eliminar_tarea(db: Session, tarea_id: int) -> TareaPOES:
    """Borrado lógico de la tarea (activo = False)."""
    tarea = obtener_tarea_por_id(db, tarea_id)

    if tarea.plan.fecha_hasta is not None:
        raise exceptions.PlanArchivadoNoEditable()

    tarea.activo = False
    
    try:
        db.commit()
        db.refresh(tarea)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error al eliminar la tarea.")
    return tarea