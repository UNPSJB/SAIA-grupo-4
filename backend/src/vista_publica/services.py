"""Servicios de configuración y consulta de la vista pública."""

import secrets
from dataclasses import asdict
from datetime import date, timedelta

from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.dashboard.metrics import (
    calcular_resumen_tareas,
    calcular_resumen_vencimientos,
)
from src.vencimientos.constants import ETIQUETA_CATEGORIA

from src.vista_publica import constants, exceptions, schemas
from src.vista_publica.incidentes import calcular_resumen_incidentes
from src.vista_publica.models import VistaPublica

# Genera un token URL-safe de 256 bits para el enlace público.
def generar_token() -> str:
    return secrets.token_urlsafe(32)


# Agrega la columna JSON a bases creadas antes de esta funcionalidad. `create_all`
# no altera tablas existentes, por eso la migración es idempotente y explícita.
def _asegurar_columna_indicadores(db: Session) -> None:
    inspector = inspect(db.get_bind())
    if "vista_publica" not in inspector.get_table_names():
        return

    columnas = {
        columna["name"] for columna in inspector.get_columns("vista_publica")
    }
    if "indicadores_activos" in columnas:
        return

    db.execute(
        text(
            "ALTER TABLE vista_publica "
            "ADD COLUMN indicadores_activos JSON NOT NULL DEFAULT '{}'"
        )
    )
    db.commit()


# Devuelve la fila única de configuración, creándola si no existe.
def obtener_o_crear_vista(db: Session) -> VistaPublica:
    vista = db.get(VistaPublica, 1)
    if vista is not None:
        return vista

    vista = VistaPublica(
        id=1,
        activo=False,
        token=generar_token(),
        indicadores_activos=dict(constants.INDICADORES_POR_DEFECTO),
    )
    db.add(vista)

    try:
        db.commit()
    except IntegrityError:
        # Otra request pudo crear la fila entre el get y el commit.
        db.rollback()
        vista = db.get(VistaPublica, 1)
        if vista is None:
            raise

    db.refresh(vista)
    return vista


# Combina la configuración guardada con los defaults del catálogo. Las claves
# nuevas del catálogo toman su default sin exigir una migración de datos.
def _estado_indicadores(vista: VistaPublica) -> dict[str, bool]:
    guardados = vista.indicadores_activos or {}
    return {
        clave: bool(guardados.get(clave, por_defecto))
        for clave, por_defecto in constants.INDICADORES_POR_DEFECTO.items()
    }


# Arma el catálogo con el estado actual de cada indicador.
def _catalogo_con_estado(vista: VistaPublica) -> list[schemas.IndicadorCatalogoEstado]:
    activos = _estado_indicadores(vista)
    return [
        schemas.IndicadorCatalogoEstado(
            **asdict(definicion),
            activo=activos[definicion.clave],
        )
        for definicion in constants.INDICADORES_CATALOGO
    ]


# Devuelve el estado actual de la vista pública para administradores.
def obtener_estado(db: Session) -> schemas.VistaPublicaEstado:
    vista = obtener_o_crear_vista(db)
    return schemas.VistaPublicaEstado(
        activo=vista.activo,
        token=vista.token,
        indicadores=_catalogo_con_estado(vista),
    )


# Activa o desactiva la vista pública sin rotar el token.
def actualizar_estado(db: Session, activo: bool) -> schemas.VistaPublicaEstado:
    vista = obtener_o_crear_vista(db)
    vista.activo = activo
    db.commit()
    db.refresh(vista)
    return obtener_estado(db)


# Guarda la selección completa de indicadores activos.
def actualizar_indicadores(
    db: Session,
    activos: list[str],
) -> schemas.VistaPublicaEstado:
    claves = set(activos)
    desconocidas = claves - set(constants.INDICADORES_POR_CLAVE)
    if desconocidas:
        raise exceptions.IndicadorDesconocido()

    vista = obtener_o_crear_vista(db)
    # Se persiste el mapa completo para que un indicador apagado no vuelva a
    # encenderse por el default al leerlo.
    vista.indicadores_activos = {
        clave: clave in claves for clave in constants.INDICADORES_POR_CLAVE
    }
    db.commit()
    db.refresh(vista)
    return obtener_estado(db)


# Garantiza que la fila de configuración exista al iniciar la app.
def inicializar_vista_publica(db: Session) -> VistaPublica:
    _asegurar_columna_indicadores(db)
    return obtener_o_crear_vista(db)


def _obtener_vista_por_token(db: Session, token: str) -> VistaPublica:
    vista = db.scalar(select(VistaPublica).where(VistaPublica.token == token))
    if vista is None:
        raise exceptions.VistaPublicaNoEncontrada()
    return vista


def _porcentaje(parte: int, total: int) -> float:
    """Devuelve un porcentaje redondeado y evita dividir por cero."""
    if total <= 0:
        return 0.0
    return round((parte / total) * 100, 1)


def _construir_indicadores(
    db: Session,
    activos: dict[str, bool],
) -> schemas.IndicadoresPublicos:
    hoy = date.today()
    hasta = hoy - timedelta(days=1)
    desde = hasta - timedelta(days=constants.DIAS_VENTANA_CUMPLIMIENTO - 1)

    metricas = None
    if activos.get("cumplimiento_tareas"):
        resumen_tareas = calcular_resumen_tareas(db, desde, hasta)
        metricas = schemas.MetricasPublicas(
            porcentaje_cumplimiento=resumen_tareas.porcentaje_cumplimiento,
            tareas_completadas=resumen_tareas.completadas,
            tareas_totales=resumen_tareas.total_tareas,
        )

    vencimientos = None
    categorias_activas = [
        clave
        for clave in constants.CATEGORIA_POR_CLAVE
        if activos.get(clave)
    ]
    resumen_activo = bool(activos.get(constants.CLAVE_VENCIMIENTOS_RESUMEN))

    if resumen_activo or categorias_activas:
        resumen_vencimientos = calcular_resumen_vencimientos(db, hoy)
        resumen_por_categoria = {
            resumen.categoria: resumen for resumen in resumen_vencimientos
        }

        por_categoria = []
        for clave in categorias_activas:
            resumen = resumen_por_categoria[constants.CATEGORIA_POR_CLAVE[clave]]
            por_categoria.append(
                schemas.CategoriaVencimientosPublica(
                    nombre=ETIQUETA_CATEGORIA[resumen.categoria.value],
                    al_dia=resumen.vigentes,
                    total=resumen.total,
                    porcentaje_al_dia=_porcentaje(
                        resumen.vigentes, resumen.total
                    ),
                )
            )

        # El resumen general conserva el alcance histórico: todas las
        # categorías, independientemente de qué tarjetas estén habilitadas.
        total_vencimientos = sum(
            resumen.total for resumen in resumen_vencimientos
        )
        al_dia = sum(resumen.vigentes for resumen in resumen_vencimientos)

        vencimientos = schemas.VencimientosPublicos(
            al_dia=al_dia if resumen_activo else None,
            total=total_vencimientos if resumen_activo else None,
            porcentaje_al_dia=(
                _porcentaje(al_dia, total_vencimientos)
                if resumen_activo
                else None
            ),
            por_categoria=por_categoria or None,
        )

    incidentes = None
    if activos.get(constants.CLAVE_INCIDENTES):
        resumen_incidentes = calcular_resumen_incidentes(db, desde, hasta)
        incidentes = schemas.IncidentesPublicos(
            total=resumen_incidentes.total,
            abiertos=resumen_incidentes.abiertos,
            cerrados=resumen_incidentes.cerrados,
            porcentaje_cerrados=resumen_incidentes.porcentaje_cerrados,
        )

    return schemas.IndicadoresPublicos(
        periodo=schemas.PeriodoPublico(desde=desde, hasta=hasta),
        metricas=metricas,
        vencimientos=vencimientos,
        incidentes=incidentes,
    )


# Devuelve los indicadores públicos o el estado desactivado.
def obtener_indicadores_publicos(
    db: Session,
    token: str,
) -> schemas.RespuestaIndicadoresPublicos:
    vista = _obtener_vista_por_token(db, token)

    if not vista.activo:
        return schemas.RespuestaIndicadoresPublicos(
            activo=False,
            mensaje=constants.MENSAJE_VISTA_DESACTIVADA,
            indicadores=None,
        )

    # La configuración se lee en cada request: los cambios del administrador se
    # reflejan de inmediato, sin caché intermedia.
    return schemas.RespuestaIndicadoresPublicos(
        activo=True,
        mensaje=None,
        indicadores=_construir_indicadores(db, _estado_indicadores(vista)),
    )
