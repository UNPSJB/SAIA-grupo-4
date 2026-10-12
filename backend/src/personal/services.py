import os
import shutil
from datetime import date, datetime
from pathlib import Path
from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError
from typing import List
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session
from src.auth.services import (
    CAPACIDADES_HABILITANTES,
    incluye_capacidad_habilitante,
    nombres_capacidades_activas,
)
from src.auth.utils import get_password_hash

from src.personal.models import Persona, PersonaCapacidad, VencimientoPersonal
from src.personal import schemas, exceptions
from src.personal.constants import Constantes, EstadoVencimiento
from src.documentos_personal import services as documentos_services, exceptions as documentos_exceptions
from src.documentos_personal.models import DocumentoPersonal
from src.capacidades.models import Capacidad
from src.capacidades.constants import RolesSistema
from src.capacidades import exceptions as capacidad_exceptions

# Carpeta local de comprobantes, dentro de la misma carpeta uploads que expone src/main.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "comprobantes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Prefijo que se guarda en url_comprobante, para no persistir rutas absolutas de la maquina
UPLOAD_URL_PREFIX = "uploads/comprobantes"

# --- FUNCIONES MODULARIZADAS DE APOYO ---

def validar_ultimo_administrador(db: Session, persona_id: int):
    es_admin = db.scalar(select(PersonaCapacidad).join(Capacidad).where(
        PersonaCapacidad.persona_id == persona_id, 
        Capacidad.nombre == RolesSistema.ADMINISTRAR, 
        PersonaCapacidad.activo == True
    ))

    if es_admin:
        admins_activos = db.scalar(select(func.count()).select_from(PersonaCapacidad).join(Capacidad).where(
            Capacidad.nombre == RolesSistema.ADMINISTRAR, 
            PersonaCapacidad.activo == True
        ))
        if admins_activos <= 1:
            raise exceptions.UltimoAdministrador()

def _procesar_bajas(db: Session, persona_id: int, actuales_ids: set, nuevos_ids: set, asignaciones_actuales: List[PersonaCapacidad]):
    for cap_id in (actuales_ids - nuevos_ids):
        asignacion = next(a for a in asignaciones_actuales if a.capacidad_id == cap_id)
        
        if asignacion.capacidad.nombre == RolesSistema.ADMINISTRAR:
            validar_ultimo_administrador(db, persona_id)
            
        asignacion.activo = False
        asignacion.fecha_hasta = datetime.now()

def _procesar_altas(db: Session, persona_id: int, actuales_ids: set, nuevos_ids: set):
    for cap_id in (nuevos_ids - actuales_ids):
        cap_db = db.scalar(select(Capacidad).where(Capacidad.id == cap_id))
        if not cap_db:
            raise capacidad_exceptions.CapacidadNoEncontrada()
        if not cap_db.activo:
            raise capacidad_exceptions.CapacidadInactiva()
            
        db.add(PersonaCapacidad(persona_id=persona_id, capacidad_id=cap_id))

def _sincronizar_capacidades(db: Session, persona_id: int, nuevos_ids: set, asignaciones_actuales: List[PersonaCapacidad]):
    actuales_ids = {a.capacidad_id for a in asignaciones_actuales}
    _procesar_bajas(db, persona_id, actuales_ids, nuevos_ids, asignaciones_actuales)
    _procesar_altas(db, persona_id, actuales_ids, nuevos_ids)

# --- SERVICIOS PRINCIPALES (CRUD) ---

def crear_persona(db: Session, persona: schemas.PersonaCreate) -> Persona:
    if not persona.capacidades_ids:
        raise exceptions.SinCapacidades()

    # Regla de negocio: solo el personal con capacidades habilitantes
    # (administrar u operar) tiene contraseña, y para ellos es obligatoria.
    habilitante = incluye_capacidad_habilitante(db, persona.capacidades_ids)
    if habilitante and not persona.password:
        raise exceptions.PasswordRequerida()
    if not habilitante and persona.password:
        raise exceptions.PasswordNoPermitida()
    
    persona_existente = db.scalar(select(Persona).where(or_(Persona.dni == persona.dni, Persona.legajo == persona.legajo)))
    if persona_existente:
        if not persona_existente.activo:
            raise exceptions.PersonaRequiereReactivacion(persona_existente.id)
        raise exceptions.PersonaDuplicada()

    # Se excluye "password": jamás se persiste crudo, solo su hash (que puede
    # ser None cuando la persona no tiene capacidades habilitantes).
    _persona = Persona(
        **persona.model_dump(exclude={"capacidades_ids", "password"}),
        activo=True,
        password_hash=get_password_hash(persona.password) if persona.password else None,
    )
    db.add(_persona)
    db.flush() 

    for cap_id in persona.capacidades_ids:
        cap_db = db.scalar(select(Capacidad).where(Capacidad.id == cap_id))
        if not cap_db:
            raise capacidad_exceptions.CapacidadNoEncontrada()
        if not cap_db.activo:
            raise capacidad_exceptions.CapacidadInactiva()
            
        db.add(PersonaCapacidad(persona_id=_persona.id, capacidad_id=cap_id))

    try:
        db.commit()
        db.refresh(_persona)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar la persona.")
    return _persona

def vencimientos_con_estado(db_persona: Persona, hoy: date) -> List[schemas.VencimientoPersonalConEstado]:
    """Vencimientos activos de la persona con su estado calculado."""
    vencimientos = []
    for vencimiento in db_persona.vencimientos:
        if vencimiento.documento.activo:
            dias_restantes, estado = calcular_estado_vencimiento(vencimiento.fecha_vencimiento, hoy)
            vencimientos.append(schemas.VencimientoPersonalConEstado(
                id=vencimiento.id,
                persona_id=vencimiento.persona_id,
                documento_id=vencimiento.documento_id,
                fecha_emision=vencimiento.fecha_emision,
                fecha_vencimiento=vencimiento.fecha_vencimiento,
                url_comprobante=vencimiento.url_comprobante,
                documento=vencimiento.documento,
                dias_restantes=dias_restantes,
                estado=estado
            ))
    # Lo más urgente primero
    vencimientos.sort(key=lambda v: v.dias_restantes)
    return vencimientos

def listar_personal(db: Session, busqueda: str | None = None, documento_id: int | None = None, estado: EstadoVencimiento | None = None) -> List[schemas.PersonaConVencimientos]:
    consulta = select(Persona)
    # Filtro por persona: coincidencia parcial en nombre, apellido o DNI
    if busqueda:
        patron = f"%{busqueda}%"
        consulta = consulta.where(or_(Persona.nombre.ilike(patron), Persona.apellido.ilike(patron), Persona.dni.ilike(patron)))
    # Filtro por tipo de vencimiento: personas que tienen cargado ese documento
    if documento_id is not None:
        consulta = consulta.where(Persona.vencimientos.any(VencimientoPersonal.documento_id == documento_id))

    hoy = date.today()
    personal = []
    for db_persona in db.scalars(consulta).all():
        vencimientos = vencimientos_con_estado(db_persona, hoy)
        # Filtro por estado: personas con al menos un vencimiento activo en ese estado.
        # Se filtra acá y no en la consulta porque el estado se calcula, no se guarda.
        if estado is not None and not any(v.estado == estado for v in vencimientos):
            continue
        datos = schemas.Persona.model_validate(db_persona).model_dump(exclude={"vencimientos"})
        personal.append(schemas.PersonaConVencimientos(**datos, vencimientos=vencimientos))
    return personal

def leer_persona(db: Session, persona_id: int) -> Persona:
    db_persona = db.scalar(select(Persona).where(Persona.id == persona_id))
    if not db_persona:
        raise exceptions.PersonaNoEncontrada()
    return db_persona

def leer_persona_con_vencimientos(db: Session, persona_id: int) -> schemas.PersonaConVencimientos:
    db_persona = leer_persona(db, persona_id)
    datos = schemas.Persona.model_validate(db_persona).model_dump(exclude={"vencimientos"})
    return schemas.PersonaConVencimientos(**datos, vencimientos=vencimientos_con_estado(db_persona, date.today()))

def crear_vencimiento(db: Session, persona_id: int, vencimiento: schemas.VencimientoPersonalCreate) -> VencimientoPersonal:
    db_persona = leer_persona(db, persona_id)
    db_documento = documentos_services.leer_documento(db, vencimiento.documento_id)

    if not db_persona.activo:
        raise exceptions.PersonaInactiva()
    if not db_documento.activo:
        raise documentos_exceptions.DocumentoPersonalInactivo()

    vencimiento_existente = db.scalar(select(VencimientoPersonal).where(VencimientoPersonal.persona_id == persona_id, VencimientoPersonal.documento_id == vencimiento.documento_id))
    if vencimiento_existente:
        raise exceptions.VencimientoDuplicado()

    db_vencimiento = VencimientoPersonal(persona_id=persona_id, **vencimiento.model_dump())
    db.add(db_vencimiento)
    try:
        db.commit()
        db.refresh(db_vencimiento)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar el vencimiento.")
    return db_vencimiento

def leer_vencimiento(db: Session, persona_id: int, vencimiento_id: int) -> VencimientoPersonal:
    db_vencimiento = db.scalar(select(VencimientoPersonal).where(VencimientoPersonal.id == vencimiento_id, VencimientoPersonal.persona_id == persona_id))
    if not db_vencimiento:
        raise exceptions.VencimientoNoEncontrado()
    return db_vencimiento

def modificar_vencimiento(db: Session, persona_id: int, vencimiento_id: int, vencimiento: schemas.VencimientoPersonalUpdate) -> VencimientoPersonal:
    db_persona = leer_persona(db, persona_id)
    db_vencimiento = leer_vencimiento(db, persona_id, vencimiento_id)
    update_data = vencimiento.model_dump(exclude_unset=True)

    if not db_persona.activo:
        raise exceptions.PersonaInactiva()

    if "fecha_vencimiento" in update_data and update_data["fecha_vencimiento"] is None:
        raise exceptions.FechaVencimientoObligatoria()

    # Se validan las fechas resultantes: las nuevas si vinieron, y si no las ya guardadas
    fecha_emision = update_data.get("fecha_emision", db_vencimiento.fecha_emision)
    fecha_vencimiento = update_data.get("fecha_vencimiento", db_vencimiento.fecha_vencimiento)
    if fecha_emision and fecha_emision >= fecha_vencimiento:
        raise exceptions.FechasVencimientoInvalidas()

    if update_data:
        db.execute(update(VencimientoPersonal).where(VencimientoPersonal.id == vencimiento_id).values(**update_data))

    try:
        db.commit()
        db.refresh(db_vencimiento)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al actualizar el vencimiento.")
    return db_vencimiento

def calcular_estado_vencimiento(fecha_vencimiento: date, hoy: date) -> tuple[int, EstadoVencimiento]:
    """Regla de semaforización: función pura, no depende de la base ni de la API.

    Devuelve (dias_restantes, estado).
    """
    dias_restantes = (fecha_vencimiento - hoy).days
    if dias_restantes < 0:
        estado = EstadoVencimiento.VENCIDO
    elif dias_restantes <= Constantes.DIAS_AVISO_PROXIMO:
        estado = EstadoVencimiento.PROXIMO
    else:
        estado = EstadoVencimiento.VIGENTE
    return dias_restantes, estado

def listar_alertas_vencimientos(db: Session) -> List[schemas.AlertaVencimiento]:
    consulta = select(VencimientoPersonal).join(VencimientoPersonal.persona).join(VencimientoPersonal.documento)
    consulta = consulta.where(Persona.activo == True, DocumentoPersonal.activo == True)
    vencimientos = db.scalars(consulta).all()

    hoy = date.today()
    alertas = []
    for vencimiento in vencimientos:
        dias_restantes, estado = calcular_estado_vencimiento(vencimiento.fecha_vencimiento, hoy)
        alertas.append(schemas.AlertaVencimiento(
            vencimiento_id=vencimiento.id,
            persona_id=vencimiento.persona_id,
            persona=f"{vencimiento.persona.apellido}, {vencimiento.persona.nombre}",
            documento=vencimiento.documento.nombre,
            fecha_vencimiento=vencimiento.fecha_vencimiento,
            dias_restantes=dias_restantes,
            estado=estado,
        ))
    # Lo más urgente primero
    alertas.sort(key=lambda a: a.dias_restantes)
    return alertas

def _guardar_comprobante_local(vencimiento_id: int, comprobante: UploadFile) -> str:
    """Guarda el archivo en la carpeta de comprobantes y devuelve la ruta relativa servida por la API."""
    # El nombre lo arma el servidor: no se usa el nombre original del archivo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = Constantes.EXTENSIONES_COMPROBANTE[comprobante.content_type]
    nombre_archivo = f"vencimiento_{vencimiento_id}_{timestamp}{extension}"

    with open(UPLOAD_DIR / nombre_archivo, "wb") as buffer:
        shutil.copyfileobj(comprobante.file, buffer)

    return f"{UPLOAD_URL_PREFIX}/{nombre_archivo}"

def adjuntar_comprobante(db: Session, persona_id: int, vencimiento_id: int, comprobante: UploadFile) -> VencimientoPersonal:
    db_persona = leer_persona(db, persona_id)
    db_vencimiento = leer_vencimiento(db, persona_id, vencimiento_id)

    if not db_persona.activo:
        raise exceptions.PersonaInactiva()

    if comprobante.content_type not in Constantes.EXTENSIONES_COMPROBANTE:
        raise exceptions.ComprobanteInvalido()

    db_vencimiento.url_comprobante = _guardar_comprobante_local(vencimiento_id, comprobante)
    try:
        db.commit()
        db.refresh(db_vencimiento)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al guardar el comprobante.")
    return db_vencimiento

def modificar_persona(db: Session, persona_id: int, persona: schemas.PersonaUpdate) -> Persona:
    db_persona = leer_persona(db, persona_id)
    update_data = persona.model_dump(exclude_unset=True)

    # La contraseña nunca se escribe cruda en la tabla: viaja aparte y solo se
    # guarda hasheada. "capacidades_ids" también se procesa en su propio bloque
    # más abajo; capturamos ambos acá para aplicar las reglas de contraseña
    # después de sincronizar las capacidades.
    nueva_password = update_data.pop("password", None)
    toca_capacidades = "capacidades_ids" in update_data

    if not db_persona.activo:
        # Si la persona está inactiva, SOLO permitimos reactivarla
        if update_data != {"activo": True}:
            raise exceptions.PersonaInactiva()

        # Se busca el historial de capacidades que la persona tenía antes de ser dada de baja
        asignaciones_historicas = db.scalars(select(PersonaCapacidad).where(
            PersonaCapacidad.persona_id == persona_id,
            PersonaCapacidad.fecha_hasta.isnot(None)
        )).all()
        
        if asignaciones_historicas:
            # Se encuentra la fecha exacta de su última baja
            ultima_fecha_baja = max([a.fecha_hasta for a in asignaciones_historicas])
            
            # Se filtran los permisos que se le cerraron estrictamente ese día
            para_restaurar = [a for a in asignaciones_historicas if a.fecha_hasta == ultima_fecha_baja]
            
            # Se extraen los IDs que necesitan restaurar
            capacidad_ids = [a.capacidad_id for a in para_restaurar]
            
            # Se buscan cuántas de esas capacidades siguen activas en la BD
            capacidades_activas = db.scalars(
                select(Capacidad).where(
                    Capacidad.id.in_(capacidad_ids), 
                    Capacidad.activo == True
                )
            ).all()
            
            # Si el número de capacidades activas no coincide con las que se necesitan, significa que al menos una fue dada de baja o borrada.
            if len(capacidades_activas) != len(set(capacidad_ids)):
                raise capacidad_exceptions.CapacidadAsociadaInactiva()
            
            # Se crea un registro nuevo e independiente para cada permiso recuperado
            for vieja in para_restaurar:
                
                # Si la baja fue hoy, se considera una reactivación de la misma operación.
                if ultima_fecha_baja.date() == datetime.today().date():
                    vieja.activo = True
                    vieja.fecha_hasta = None

                # Si la baja fue en una fecha anterior, se considera una nueva contratación.
                else:
                    db.add(
                        PersonaCapacidad(
                            persona_id=persona_id,
                            capacidad_id=vieja.capacidad_id
                        )
                    )

    else:
        if update_data.get("activo") is False:
            raise exceptions.PersonaBajaNoPermitida()

        if "dni" in update_data or "legajo" in update_data:
            dni_check = update_data.get("dni", db_persona.dni)
            legajo_check = update_data.get("legajo", db_persona.legajo)
            if db.scalar(select(Persona).where(or_(Persona.dni == dni_check, Persona.legajo == legajo_check), Persona.id != persona_id)):
                raise exceptions.PersonaDuplicada()

    if "capacidades_ids" in update_data:
        nuevos_ids = set(update_data.pop("capacidades_ids"))
        if not nuevos_ids:
            raise exceptions.SinCapacidades()

        asignaciones_actuales = db.scalars(select(PersonaCapacidad).where(
            PersonaCapacidad.persona_id == persona_id, PersonaCapacidad.activo == True
        )).all()
        
        _sincronizar_capacidades(db, persona_id, nuevos_ids, asignaciones_actuales)

    # Reglas de contraseña según las capacidades vigentes RESULTANTES después
    # de sincronizar. Solo aplica si se tocan capacidades o se envía password:
    # la reactivación pura {"activo": true} queda exenta para no bloquearla.
    if toca_capacidades or nueva_password is not None:
        db.flush()  # la sesión tiene autoflush=False: forzamos ver el estado final
        habilitante = bool(
            nombres_capacidades_activas(db, persona_id) & CAPACIDADES_HABILITANTES
        )
        if habilitante:
            if nueva_password:
                db_persona.password_hash = get_password_hash(nueva_password)
            elif db_persona.password_hash is None:
                raise exceptions.PasswordRequerida()
        elif nueva_password:
            raise exceptions.PasswordNoPermitida()

    if update_data:
        db.execute(update(Persona).where(Persona.id == persona_id).values(**update_data))
        
    try:
        db.commit()
        db.refresh(db_persona)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al actualizar la persona.")
    return db_persona

def eliminar_persona(db: Session, persona_id: int) -> Persona:
    db_persona = leer_persona(db, persona_id)
    
    validar_ultimo_administrador(db, persona_id)

    db_persona.activo = False
    db.execute(update(PersonaCapacidad).where(
        PersonaCapacidad.persona_id == persona_id, PersonaCapacidad.activo == True
    ).values(activo=False, fecha_hasta=datetime.now()))
    
    try:
        db.commit()
        db.refresh(db_persona)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(detail="Error de integridad al intentar eliminar la persona.")
    return db_persona