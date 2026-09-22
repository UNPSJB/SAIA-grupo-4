from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.capacidades.models import Capacidad, TipoCapacidad
from src.capacidades.constants import RolesSistema
from src.capacidades import schemas, exceptions
from src.personal.models import PersonaCapacidad

def inicializar_capacidades_sistema(db: Session):
    capacidades_base = {
        RolesSistema.OPERAR: "Permite la ejecución operativa diaria: consultar el checklist de limpieza, registrar tareas realizadas con evidencia y consumo de químicos, consultar procedimientos vigentes y reportar incidentes.",
        RolesSistema.ADMINISTRAR: "Permite la configuración del sistema y el control de gestión: administración de maestros, diseño del plan POES, control y alerta de vencimientos (personal y equipos), revisión de historiales, cierre de incidentes y tablero de control."
    }
    
    for nombre, descripcion in capacidades_base.items():
        if not db.scalar(select(Capacidad).where(Capacidad.nombre == nombre)):
            db.add(Capacidad(nombre=nombre, descripcion=descripcion, tipo=TipoCapacidad.SISTEMA, activo=True))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

def crear_capacidad(db: Session, capacidad: schemas.CapacidadCreate) -> Capacidad:
    capacidad_existente = db.scalar(select(Capacidad).where(Capacidad.nombre == capacidad.nombre))
    if capacidad_existente:
        if not capacidad_existente.activo:
            raise exceptions.CapacidadRequiereReactivacion(capacidad_existente.id)
        raise exceptions.CapacidadDuplicada()

    _capacidad = Capacidad(**capacidad.model_dump(), tipo=TipoCapacidad.PERSONALIZADA, activo=True)
    db.add(_capacidad)
    try:
        db.commit()
        db.refresh(_capacidad)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar la capacidad.")
    return _capacidad

def listar_capacidades(db: Session) -> List[Capacidad]:
    return db.scalars(select(Capacidad)).all()

def leer_capacidad(db: Session, capacidad_id: int) -> Capacidad:
    db_capacidad = db.scalar(select(Capacidad).where(Capacidad.id == capacidad_id))
    if not db_capacidad:
        raise exceptions.CapacidadNoEncontrada()
    return db_capacidad

def modificar_capacidad(db: Session, capacidad_id: int, capacidad: schemas.CapacidadUpdate) -> Capacidad:
    db_capacidad = leer_capacidad(db, capacidad_id)
    update_data = capacidad.model_dump(exclude_unset=True)

    if db_capacidad.tipo == TipoCapacidad.SISTEMA:
        raise exceptions.ModificacionSistemaDenegada()

    if not db_capacidad.activo and update_data != {"activo": True}:
        raise exceptions.CapacidadInactiva()

    if update_data.get("activo") is False:
        raise exceptions.CapacidadBajaNoPermitida()

    if "nombre" in update_data:
        duplicada = db.scalar(select(Capacidad).where(Capacidad.nombre == update_data["nombre"], Capacidad.id != capacidad_id))
        if duplicada:
            if not duplicada.activo:
                raise exceptions.CapacidadRequiereReactivacion(duplicada.id)
            raise exceptions.CapacidadDuplicada()

    if update_data:
        db.execute(update(Capacidad).where(Capacidad.id == capacidad_id).values(**update_data))
        try:
            db.commit()
            db.refresh(db_capacidad)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(detail="Error de integridad al actualizar la capacidad.")
            
    return db_capacidad

def eliminar_capacidad(db: Session, capacidad_id: int) -> Capacidad:
    db_capacidad = leer_capacidad(db, capacidad_id)

    if db_capacidad.tipo == TipoCapacidad.SISTEMA:
        raise exceptions.ModificacionSistemaDenegada()

    en_uso = db.scalar(select(PersonaCapacidad).where(PersonaCapacidad.capacidad_id == capacidad_id, PersonaCapacidad.activo == True))
    if en_uso:
        raise exceptions.CapacidadEnUso()

    db_capacidad.activo = False
    try:
        db.commit()
        db.refresh(db_capacidad)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al eliminar la capacidad.")

    return db_capacidad