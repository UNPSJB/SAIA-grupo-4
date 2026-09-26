import os
import shutil
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy.exc import IntegrityError
from typing import List
from fastapi import UploadFile
from sqlalchemy import update, select
from sqlalchemy.orm import Session, selectinload

from src.plan_poes.models import TareaPOES, TareaInsumoQuimico, TareaElementoLimpieza
from src.insumo_quimico.models import InsumoQuimico 
from src.plan_poes.services import obtener_plan_activo
from src.checklists.models import EjecucionTarea, EjecucionInsumoQuimico
from src.checklists.constants import EstadoEjecucion
from src.checklists import exceptions
from src.checklists import schemas

# carpeta local
UPLOAD_DIR = "uploads/evidencias"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _cerrar_tareas_vencidas(db: Session, fecha: date) -> None:
    """Pasa a NO_REALIZADA todas las tareas pendientes de días anteriores."""
    stmt = (
            update(EjecucionTarea)
            .where(
                EjecucionTarea.fecha_programada < fecha,
                EjecucionTarea.estado == EstadoEjecucion.PENDIENTE
            )
            .values(estado=EstadoEjecucion.NO_REALIZADA)
        )
    db.execute(stmt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al actualizar el estado de tareas vencidas.")

def _filtrar_tareas_por_dia(tareas: List[TareaPOES], fecha: date) -> List[TareaPOES]:
    """Filtra las tareas del plan activo que corresponden a la fecha indicada."""
    dias_semana_completos = {1: "lunes", 2: "martes", 3: "miercoles", 4: "jueves", 5: "viernes", 6: "sabado", 7: "domingo"}
    dias_semana_abrev = {1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 7: "dom"}

    dia_iso = fecha.isoweekday() 
    dia_mes = str(fecha.day) 
    
    nombre_dia_completo = dias_semana_completos[dia_iso]
    nombre_dia_abrev = dias_semana_abrev[dia_iso]

    tareas_esperadas = []
    for tarea in tareas:
        if not tarea.activo:
            continue
            
        freq = tarea.frecuencia
        detalle = tarea.detalle_frecuencia
        
        if freq == "diaria":
            tareas_esperadas.append(tarea)
        elif freq == "semanal" and detalle and detalle.lower().strip() == nombre_dia_completo:
            tareas_esperadas.append(tarea)
        elif freq == "mensual" and detalle and detalle.strip() == dia_mes:
            tareas_esperadas.append(tarea)
        elif freq == "dias_especificos" and detalle:
            dias_permitidos = [d.strip().lower() for d in detalle.split(",")]
            if nombre_dia_abrev in dias_permitidos:
                tareas_esperadas.append(tarea)
                
    return tareas_esperadas

def _generar_ejecuciones_faltantes(db: Session, tareas_esperadas: List[TareaPOES], fecha: date) -> None:
    """Busca qué tareas faltan generar hoy y las inserta en la base de datos."""
    # Se buscan las ejecuciones que ya estan generadas
    ids_esperados = [t.id for t in tareas_esperadas]
    ejecuciones_existentes = db.scalars(
        select(EjecucionTarea.id_tarea)
        .where(
            EjecucionTarea.fecha_programada == fecha,
            EjecucionTarea.id_tarea.in_(ids_esperados)
        )
    ).all()
        
    # Se anaden al checklist las tareas que fueron anadidas ese mismo dia y que corresponden a ese dia
    nuevas_ejecuciones = []
    for tarea in tareas_esperadas:
        if tarea.id not in ejecuciones_existentes:
            nueva_ejec = EjecucionTarea(
                id_tarea=tarea.id,
                fecha_programada=fecha,
                estado=EstadoEjecucion.PENDIENTE
            )
            db.add(nueva_ejec)
            nuevas_ejecuciones.append(nueva_ejec)
    
    if nuevas_ejecuciones:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(detail="Error de integridad al generar las ejecuciones del día.")
        
def _registrar_consumo(db: Session, ejecucion_id: int, insumo_id: int, cantidad: float) -> None:
    """Guarda el registro de la ejecución y actualiza el acumulador del insumo."""

    cantidad_exacta = Decimal(str(cantidad))

    # Se guarda el registro histórico de la ejecución
    db.add(EjecucionInsumoQuimico(
        ejecucion_tarea_id=ejecucion_id,
        insumo_quimico_id=insumo_id,
        cantidad_utilizada=cantidad_exacta
    ))

    # Se actualiza el acumulador incremental
    db.execute(
        update(InsumoQuimico)
        .where(InsumoQuimico.id == insumo_id)
        .values(consumo=InsumoQuimico.consumo + cantidad_exacta)
    )
    
def _guardar_foto_local(ejecucion_id: int, foto: UploadFile) -> str:
    """Guarda el archivo en el disco y devuelve la ruta."""
    # nombre unico con la fecha y hora
    hora_actual = datetime.now() 
    timestamp = hora_actual.strftime("%Y%m%d_%H%M%S")
    nombre_archivo = f"tarea_{ejecucion_id}_{timestamp}_{foto.filename}"
    ruta_foto = os.path.join(UPLOAD_DIR, nombre_archivo)
    
    with open(ruta_foto, "wb") as buffer:
        shutil.copyfileobj(foto.file, buffer)
        
    return ruta_foto


def obtener_tareas_del_dia(db: Session, fecha: date = None) -> List[EjecucionTarea]:
    """Generador Lazy de Tareas del Checklist"""
    if fecha is None:
        fecha = date.today()

    # Se cierran automaticamente tareas vencidas
    _cerrar_tareas_vencidas(db, fecha)

    # Se obtiene el plan vigente
    plan_vigente = obtener_plan_activo(db)
    if not plan_vigente or not plan_vigente.tareas:
        return []

    # Se filtran las tareas que corresponden al dia
    tareas_esperadas = _filtrar_tareas_por_dia(plan_vigente.tareas, fecha)
    if not tareas_esperadas:
        return []

    # Se generan ejecuciones faltantes en caso de haber
    _generar_ejecuciones_faltantes(db, tareas_esperadas, fecha)

    # Se retornan las ejecuciones del dia con selectinload (Problema N+1 resuelto)
    ids_esperados = [t.id for t in tareas_esperadas]
    return db.scalars(
        select(EjecucionTarea)
        .where(
            EjecucionTarea.fecha_programada == fecha,
            EjecucionTarea.id_tarea.in_(ids_esperados)
        )
        .options(
            # Trae la Tarea base y de ahí trae el Equipo asociado (ej: "Heladera 1")
            selectinload(EjecucionTarea.tarea).selectinload(TareaPOES.equipo),
            
            # Trae la Tarea base y de ahí trae el Sector asociado (ej: "Cocina")
            selectinload(EjecucionTarea.tarea).selectinload(TareaPOES.sector),
            
            # RAMA DE INSUMOS QUÍMICOS:
            selectinload(EjecucionTarea.tarea)
                # Trae la lista de la tabla intermedia (dosis, dilución)
                .selectinload(TareaPOES.insumos_quimicos)
                # De esa tabla, viaja al catálogo para traer el nombre del insumo (ej: "Detergente")
                .selectinload(TareaInsumoQuimico.insumo_quimico)
                # Y de ese insumo, viaja a unidades para traer el símbolo (ej: "[ml]")
                .selectinload(InsumoQuimico.unidad_medida),
            
            # RAMA DE ELEMENTOS DE LIMPIEZA:
            selectinload(EjecucionTarea.tarea)
                # Trae la lista de la tabla intermedia (cantidades requeridas)
                .selectinload(TareaPOES.elementos_limpieza)
                # De esa tabla, viaja al catálogo para traer el nombre (ej: "Trapo rejilla")
                .selectinload(TareaElementoLimpieza.elemento_limpieza)
        )
    ).all()
    
def obtener_historial_ejecuciones(db: Session, fecha_desde: date, fecha_hasta: date) -> List[EjecucionTarea]:
    """Devuelve todas las ejecuciones completadas y no realizadas en un rango de fechas"""
    if fecha_desde > fecha_hasta:
        raise exceptions.RangoFechasInvalido()
        
    if fecha_hasta >= date.today():
        raise exceptions.FechaFuturaHistorial()
    
    return db.scalars(
        select(EjecucionTarea)
        .where(
            EjecucionTarea.fecha_programada >= fecha_desde,
            EjecucionTarea.fecha_programada <= fecha_hasta,
            # Se excluye pendiente para tener solo las ejecuciones "cerradas"
            EjecucionTarea.estado.in_([EstadoEjecucion.COMPLETADA, EstadoEjecucion.NO_REALIZADA])
        )
        .order_by(
            EjecucionTarea.fecha_programada.desc(),
            EjecucionTarea.fecha_hora_ejecucion.desc()
        )
        .options(
            selectinload(EjecucionTarea.tarea).selectinload(TareaPOES.equipo),
            selectinload(EjecucionTarea.tarea).selectinload(TareaPOES.sector),
            selectinload(EjecucionTarea.tarea)
                .selectinload(TareaPOES.insumos_quimicos)
                .selectinload(TareaInsumoQuimico.insumo_quimico)
                .selectinload(InsumoQuimico.unidad_medida),
            selectinload(EjecucionTarea.tarea)
                .selectinload(TareaPOES.elementos_limpieza)
                .selectinload(TareaElementoLimpieza.elemento_limpieza)
        )
    ).all()

def completar_ejecucion(db: Session, ejecucion_id: int, datos: schemas.CompletarEjecucion, foto: UploadFile | None = None) -> EjecucionTarea:
    """Procesamiento del completado, registro de consumos y guardado de foto local."""
    
    ejecucion = db.scalars(
        select(EjecucionTarea)
        .where(EjecucionTarea.id == ejecucion_id)
        .options(selectinload(EjecucionTarea.consumos_insumos))
    ).first()
    
    if not ejecucion:
        raise exceptions.EjecucionNoEncontrada()

    if ejecucion.estado == EstadoEjecucion.COMPLETADA:
        raise exceptions.EjecucionInmutable()
    
    if ejecucion.estado == EstadoEjecucion.NO_REALIZADA:
        raise exceptions.EjecucionVencida()
    
    ruta_foto = ejecucion.foto_url # Se mantiene la actual por si no envían una nueva

    #foto opcional
    if foto:
        if not foto.content_type.startswith("image/"):  # Se valida que el archivo que se pasa es una imagen
            raise exceptions.ArchivoInvalido()
        ruta_foto = _guardar_foto_local(ejecucion_id, foto)

    # Se actualizan los datos de la ejecucion con los datos de cuando registra su realizacion
    
    ejecucion.estado = EstadoEjecucion.COMPLETADA
    ejecucion.fecha_hora_ejecucion = datetime.now()
    
    ejecucion.operador_id = datos.operador_id
    ejecucion.observaciones = datos.observaciones
    ejecucion.foto_url = ruta_foto
    
    # Registro de consumos
    for consumo in datos.consumos:
        if consumo.cantidad_utilizada is not None and consumo.cantidad_utilizada > 0:   # Solo se registran los consumos mayores a 0
            _registrar_consumo(
                db=db,
                ejecucion_id=ejecucion.id,
                insumo_id=consumo.insumo_quimico_id,
                cantidad=consumo.cantidad_utilizada
            )

    try:
        db.commit()
        db.refresh(ejecucion)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al completar la ejecución y registrar consumos.")
    return ejecucion