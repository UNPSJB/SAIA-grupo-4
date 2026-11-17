import os
import unicodedata
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import UploadFile
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from src.configuracion import exceptions, schemas
from src.configuracion.constants import Constantes, ErrorCode, EstadoVersionNormativa, NORMATIVA_INICIAL_NOMBRE, REGLAS_INICIALES_LEY_27642
from src.configuracion.models import ConfiguracionSistema, ConfiguracionModulo, VersionParametroFrontal, ReglaUmbralFrontal
from src.configuracion.schemas import ConfiguracionSistemaUpdate, ModuloOctogonosUpdate, ParametrosFrontalesConsolidadoResponse, VersionParametroFrontalCreate
from src.personal.models import Persona
from src.recetas.constants import EstadoReceta
from src.recetas.models import Receta
from src.personal.models import Persona

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


def _normalizar_ascii(texto: str) -> str:
    return (
        unicodedata.normalize("NFKD", texto)
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def _reasignar_recetas_a_version_parametro(db: Session, nueva_version_id: int) -> None:
    """Migra recetas en borrador o activas sin lotes a la nueva versión de parámetros frontales."""
    db.execute(
        update(Receta)
        .where(
            or_(
                Receta.estado == EstadoReceta.BORRADOR,
                (Receta.estado == EstadoReceta.ACTIVA) & (~Receta.lotes.any()),
            )
        )
        .values(version_parametro_frontal_id=nueva_version_id)
    )


def inicializar_parametros_frontales(
    db: Session, normalizar_ascii: bool = False
) -> VersionParametroFrontal:
    """Crea la configuración del módulo de octógonos y la Versión 1 (Ley 27.642) si no existen."""
    modulo = db.get(ConfiguracionModulo, 1)
    if modulo is None:
        obs = "Módulo de rotulado frontal activo por defecto (Ley 27.642)"
        modulo = ConfiguracionModulo(
            id=1,
            octogonos_activos=True,
            observacion=_normalizar_ascii(obs) if normalizar_ascii else obs,
            fecha_modificacion=datetime.now(),
        )
        db.add(modulo)

    version_vigente = db.scalar(
        select(VersionParametroFrontal).where(
            VersionParametroFrontal.estado == EstadoVersionNormativa.VIGENTE
        )
    )
    if version_vigente is None:
        ahora = datetime.now()
        motivo = "Carga inicial automática de parámetros normativos (ANMAT Etapa 2)"
        version_vigente = VersionParametroFrontal(
            numero_version=1,
            normativa_referencia=(
                _normalizar_ascii(NORMATIVA_INICIAL_NOMBRE)
                if normalizar_ascii
                else NORMATIVA_INICIAL_NOMBRE
            ),
            motivo_cambio=_normalizar_ascii(motivo) if normalizar_ascii else motivo,
            estado=EstadoVersionNormativa.VIGENTE,
            fecha_vigencia_desde=ahora,
            fecha_vigencia_hasta=None,
            creado_por_id=None,
        )
        for regla_data in REGLAS_INICIALES_LEY_27642:
            datos_regla = dict(regla_data)
            if normalizar_ascii:
                datos_regla["leyenda_sello"] = _normalizar_ascii(datos_regla["leyenda_sello"])
                datos_regla["unidad_umbral"] = _normalizar_ascii(datos_regla["unidad_umbral"])
                if datos_regla.get("condicion"):
                    datos_regla["condicion"] = _normalizar_ascii(datos_regla["condicion"])
            version_vigente.reglas.append(ReglaUmbralFrontal(**datos_regla))
        db.add(version_vigente)

    db.commit()
    db.refresh(version_vigente)
    return version_vigente


def obtener_estado_parametros_frontales(
    db: Session,
) -> ParametrosFrontalesConsolidadoResponse:
    version_vigente = inicializar_parametros_frontales(db)
    modulo = db.get(ConfiguracionModulo, 1)

    historial = list(
        db.scalars(
            select(VersionParametroFrontal)
            .where(VersionParametroFrontal.estado == EstadoVersionNormativa.HISTORICA)
            .order_by(VersionParametroFrontal.numero_version.desc())
        ).all()
    )

    return ParametrosFrontalesConsolidadoResponse(
        modulo=modulo,
        version_vigente=version_vigente,
        historial=historial,
    )


def crear_nueva_version_parametros(
    db: Session,
    datos: VersionParametroFrontalCreate,
    usuario: Persona,
) -> ParametrosFrontalesConsolidadoResponse:
    """Archiva la versión vigente como HISTORICA y crea una nueva versión VIGENTE."""
    version_actual = inicializar_parametros_frontales(db)
    ahora = datetime.now()

    version_actual.estado = EstadoVersionNormativa.HISTORICA
    version_actual.fecha_vigencia_hasta = ahora

    nueva_version = VersionParametroFrontal(
        numero_version=version_actual.numero_version + 1,
        normativa_referencia=datos.normativa_referencia,
        motivo_cambio=datos.motivo_cambio.strip() if datos.motivo_cambio else None,
        estado=EstadoVersionNormativa.VIGENTE,
        fecha_vigencia_desde=ahora,
        fecha_vigencia_hasta=None,
        creado_por_id=usuario.id,
    )

    for regla in datos.reglas:
        nueva_version.reglas.append(
            ReglaUmbralFrontal(
                nutriente_critico=regla.nutriente_critico,
                leyenda_sello=regla.leyenda_sello,
                categoria=regla.categoria,
                valor_umbral=regla.valor_umbral,
                unidad_umbral=regla.unidad_umbral,
                condicion=regla.condicion,
            )
        )

    db.add(nueva_version)
    db.flush()
    _reasignar_recetas_a_version_parametro(db, nueva_version.id)
    db.commit()
    db.refresh(nueva_version)

    return obtener_estado_parametros_frontales(db)


def actualizar_modulo_octogonos(
    db: Session,
    datos: ModuloOctogonosUpdate,
    usuario: Persona,
) -> ConfiguracionModulo:
    inicializar_parametros_frontales(db)
    modulo = db.get(ConfiguracionModulo, 1)
    modulo.octogonos_activos = datos.octogonos_activos
    modulo.observacion = datos.observacion.strip() if datos.observacion else None
    modulo.fecha_modificacion = datetime.now()
    modulo.modificado_por_id = usuario.id

    db.commit()
    db.refresh(modulo)
    return modulo