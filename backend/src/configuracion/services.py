import os
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.configuracion import exceptions, schemas
from src.configuracion.constants import Constantes
from src.configuracion.models import ConfiguracionSistema

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "configuracion"
os.makedirs(UPLOAD_DIR, exist_ok=True)
UPLOAD_URL_PREFIX = "uploads/configuracion"

def obtener_o_crear_configuracion(db: Session) -> ConfiguracionSistema:
    config = db.scalar(select(ConfiguracionSistema).where(ConfiguracionSistema.id == 1))
    if not config:
        config = ConfiguracionSistema(
            id=1,
            nombre_establecimiento=Constantes.NOMBRE_DEFECTO,
            fecha_modificacion=datetime.now(),
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def actualizar_configuracion(
    db: Session,
    datos: schemas.ConfiguracionUpdate,
    usuario_id: int,
) -> ConfiguracionSistema:
    config = obtener_o_crear_configuracion(db)
    for campo, valor in datos.model_dump().items():
        if isinstance(valor, str):
            valor = valor.strip() or None
            if campo == "nombre_establecimiento" and valor is None:
                valor = Constantes.NOMBRE_DEFECTO
        setattr(config, campo, valor)

    config.fecha_modificacion = datetime.now()
    config.modificado_por_id = usuario_id
    db.commit()
    db.refresh(config)
    return config

def _eliminar_archivo_logo_previo(logo_url: str | None) -> None:
    if not logo_url:
        return
    nombre_archivo = Path(logo_url).name
    ruta_previa = UPLOAD_DIR / nombre_archivo
    if ruta_previa.is_file():
        try:
            ruta_previa.unlink()
        except OSError:
            pass

def subir_logo(db: Session, archivo: UploadFile, usuario_id: int) -> ConfiguracionSistema:
    content_type = (archivo.content_type or "").lower().strip()
    extension = Constantes.EXTENSIONES_PERMITIDAS.get(content_type)
    if not extension:
        raise exceptions.ArchivoLogoInvalido()

    contenido = archivo.file.read()
    if not contenido or len(contenido) > Constantes.MAX_LOGO_SIZE_BYTES:
        raise exceptions.ArchivoLogoMuyGrande()

    config = obtener_o_crear_configuracion(db)
    _eliminar_archivo_logo_previo(config.logo_url)

    nombre_archivo = f"logo_{uuid.uuid4().hex[:10]}{extension}"
    ruta_destino = UPLOAD_DIR / nombre_archivo
    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    config.logo_url = f"{UPLOAD_URL_PREFIX}/{nombre_archivo}"
    config.fecha_modificacion = datetime.now()
    config.modificado_por_id = usuario_id
    db.commit()
    db.refresh(config)
    return config

def eliminar_logo(db: Session, usuario_id: int) -> ConfiguracionSistema:
    config = obtener_o_crear_configuracion(db)
    _eliminar_archivo_logo_previo(config.logo_url)
    config.logo_url = None
    config.fecha_modificacion = datetime.now()
    config.modificado_por_id = usuario_id
    db.commit()
    db.refresh(config)
    return config