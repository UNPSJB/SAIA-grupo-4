import os
import uuid

from sqlalchemy.exc import IntegrityError
from typing import List, Optional   

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.equipos.models import Equipo
from src.sectores.models import Sector
from src.equipos import schemas, exceptions
from src.sectores import exceptions as sector_exceptions

from datetime import date, timedelta
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from src.equipos.models import Equipo, CalibracionEquipo
from src.equipos.schemas import CalibracionEquipoCreate, AlertaCalibracion

UMBRAL_DIAS_PROXIMO = 15
EXTENSIONES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MAX_TAMANIO_BYTES= 10 * 1024 * 1024  # 10 MB

def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> Equipo:
    sector = db.scalar(
        select(Sector).where(
            Sector.id == equipo.sector_id
        )
    )

    if sector is None:
        raise sector_exceptions.SectorNoEncontrado()

    if not sector.activo:
        raise sector_exceptions.SectorInactivo()

    equipo_existente = db.scalar(
        select(Equipo).where(
            Equipo.nombre == equipo.nombre,
            Equipo.marca == equipo.marca,
            Equipo.numero_serie == equipo.numero_serie,
        )
    )

    if equipo_existente:
        if not equipo_existente.activo:
            raise exceptions.EquipoRequiereReactivacion(
                equipo_existente.id
            )

        raise exceptions.EquipoDuplicado()

    _equipo = Equipo(**equipo.model_dump(), activo=True)

    db.add(_equipo)
    try:
        db.commit()
        db.refresh(_equipo)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el equipo."
        )

    return _equipo


def listar_equipos(db: Session) -> List[Equipo]:
    return db.scalars(select(Equipo)).all()


def leer_equipo(db: Session, equipo_id: int) -> Equipo:
    db_equipo = db.scalar(
        select(Equipo).where(
            Equipo.id == equipo_id
        )
    )

    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()

    return db_equipo


def modificar_equipo(db: Session, equipo_id: int, equipo: schemas.EquipoUpdate) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    update_data = equipo.model_dump(exclude_unset=True)

    # 1. EQUIPO INACTIVO:
    # Solo se permite reactivarlo.
    if not db_equipo.activo:

        if update_data != {"activo": True}:
            raise exceptions.EquipoInactivo()

        # El sector actual también debe estar activo.
        if not db_equipo.sector.activo:
            raise sector_exceptions.SectorInactivo()

    # 2. EQUIPO ACTIVO:
    else:

        # La baja se realiza exclusivamente mediante DELETE.
        if update_data.get("activo") is False:
            raise exceptions.EquipoBajaNoPermitida()

        # Comprobar duplicados si cambian nombre, marca o número de serie.
        if any(
            campo in update_data
            for campo in (
                "nombre",
                "marca",
                "numero_serie"
            )
        ):
            nombre = update_data.get(
                "nombre",
                db_equipo.nombre
            )

            marca = update_data.get(
                "marca",
                db_equipo.marca
            )

            numero_serie = update_data.get(
                "numero_serie",
                db_equipo.numero_serie
            )

            equipo_existente = db.scalar(
                select(Equipo).where(
                    Equipo.nombre == nombre,
                    Equipo.marca == marca,
                    Equipo.numero_serie == numero_serie,
                    Equipo.id != equipo_id
                )
            )

            if equipo_existente:
                raise exceptions.EquipoDuplicado()

        # Comprobar que el nuevo sector exista y esté activo.
        if "sector_id" in update_data:

            sector_nuevo = db.scalar(
                select(Sector).where(
                    Sector.id == update_data["sector_id"]
                )
            )

            if sector_nuevo is None:
                raise sector_exceptions.SectorNoEncontrado()

            if not sector_nuevo.activo:
                raise sector_exceptions.SectorInactivo()

    # 3. IMPACTAR CAMBIOS
    if update_data:
        db.execute(
            update(Equipo)
            .where(Equipo.id == equipo_id)
            .values(**update_data)
        )

        try:
            db.commit()
            db.refresh(db_equipo)
        except IntegrityError:
            db.rollback()
            raise exceptions.Conflict(
                detail="Error de integridad al intentar guardar el equipo."
            )

    return db_equipo


def eliminar_equipo(db: Session, equipo_id: int) -> Equipo:
    db_equipo = leer_equipo(db, equipo_id)
    db_equipo.activo = False
    try:
        db.commit()
        db.refresh(db_equipo)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el equipo."
        )

    return db_equipo

def calcular_semaforo_equipo(fecha_ultima: date, frecuencia_dias: int, fecha_ref: date | None = None) -> tuple[date, int, str]:
    """Calcula la próxima fecha, días restantes y estado (vencido, proximo, al_dia)."""
    proxima_fecha = fecha_ultima + timedelta(days=frecuencia_dias)
    hoy = fecha_ref or date.today()
    dias_restantes = (proxima_fecha - hoy).days

    if dias_restantes < 0:
        estado = "vencido"
    elif dias_restantes <= UMBRAL_DIAS_PROXIMO:
        estado = "proximo"
    else:
        estado = "al_dia"

    return proxima_fecha, dias_restantes, estado


def registrar_calibracion(
    db: Session,
    equipo_id: int,
    fecha_calibracion: date,
    observaciones: Optional[str] = None,
    certificado_url: Optional[str] = None,
    archivo: Optional[UploadFile] = None,
) -> CalibracionEquipo:
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id, Equipo.activo.is_(True)).first()
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado o inactivo",
        )

    if fecha_calibracion > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de calibración no puede ser futura",
        )

    # Si enviaron un archivo físico, se procesa y genera la URL
    if archivo and archivo.filename:
        certificado_url = guardar_archivo_certificado(archivo)

    calibracion = CalibracionEquipo(
        equipo_id=equipo_id,
        fecha_calibracion=fecha_calibracion,
        observaciones=observaciones,
        certificado_url=certificado_url,
    )
    db.add(calibracion)

    # Actualiza la fecha de última calibración en el equipo
    equipo.fecha_ultima_calibracion = fecha_calibracion
    db.commit()
    db.refresh(calibracion)
    return calibracion


def listar_historial_calibraciones(db: Session, equipo_id: int) -> list[CalibracionEquipo]:
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado",
        )
    return (
        db.query(CalibracionEquipo)
        .filter(CalibracionEquipo.equipo_id == equipo_id)
        .order_by(CalibracionEquipo.fecha_calibracion.desc())
        .all()
    )


def listar_alertas_calibracion(db: Session) -> list[AlertaCalibracion]:
    equipos = (
        db.query(Equipo)
        .filter(
            Equipo.activo.is_(True),
            Equipo.frecuencia_calibracion_dias.isnot(None),
            Equipo.frecuencia_calibracion_dias > 0,
            Equipo.fecha_ultima_calibracion.isnot(None),
        )
        .all()
    )

    alertas: list[AlertaCalibracion] = []
    for eq in equipos:
        proxima, dias, estado = calcular_semaforo_equipo(
            eq.fecha_ultima_calibracion, eq.frecuencia_calibracion_dias  # type: ignore
        )
        alertas.append(
            AlertaCalibracion(
                entidad_id=eq.id,
                entidad=f"{eq.nombre} ({eq.marca} - {eq.numero_serie})",
                tipo="equipo",
                proxima_fecha=proxima,
                dias_restantes=dias,
                estado=estado,
            )
        )

    # Ordenados por más urgente primero (menor cantidad de días restantes)
    alertas.sort(key=lambda a: a.dias_restantes)
    return alertas

def guardar_archivo_certificado(archivo: UploadFile) -> str:
    """Valida formato y tamaño, guardando el archivo en uploads/certificados."""
    nombre_original = archivo.filename or ""
    ext = os.path.splitext(nombre_original)[1].lower()
    
    if ext not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de archivo '{ext}' no permitido. Use PDF, JPG, PNG o WebP.",
        )

    contenido = archivo.file.read()
    if len(contenido) > MAX_TAMANIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El certificado no debe superar los 10MB.",
        )

    # Nombre seguro y único para evitar colisiones
    nombre_generado = f"{uuid.uuid4().hex}{ext}"
    ruta_directorio = os.path.join("uploads", "certificados")
    os.makedirs(ruta_directorio, exist_ok=True)
    
    ruta_completa = os.path.join(ruta_directorio, nombre_generado)
    with open(ruta_completa, "wb") as f:
        f.write(contenido)

    return f"/uploads/certificados/{nombre_generado}"