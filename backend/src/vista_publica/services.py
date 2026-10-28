"""Servicios de configuración y consulta de la vista pública."""

import secrets
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.dashboard.metrics import (
    calcular_resumen_tareas,
    calcular_resumen_vencimientos,
)
from src.vencimientos.constants import ETIQUETA_CATEGORIA

from src.vista_publica import constants, exceptions, schemas
from src.vista_publica.models import VistaPublica

# Genera un token URL-safe de 256 bits para el enlace público.
def generar_token() -> str:
    return secrets.token_urlsafe(32)

# Devuelve la fila única de configuración, creándola si no existe.
def obtener_o_crear_vista(db: Session) -> VistaPublica:
    vista = db.get(VistaPublica, 1)
    if vista is not None:
        return vista

    vista = VistaPublica(id=1, activo=False, token=generar_token())
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

# Devuelve el estado actual de la vista pública para administradores.
def obtener_estado(db: Session) -> schemas.VistaPublicaEstado:
    vista = obtener_o_crear_vista(db)
    return schemas.VistaPublicaEstado(activo=vista.activo, token=vista.token)


# Activa o desactiva la vista pública sin rotar el token.
def actualizar_estado(db: Session, activo: bool) -> schemas.VistaPublicaEstado:
    vista = obtener_o_crear_vista(db)
    vista.activo = activo
    db.commit()
    db.refresh(vista)
    return schemas.VistaPublicaEstado(activo=vista.activo, token=vista.token)

# Garantiza que la fila de configuración exista al iniciar la app.
def inicializar_vista_publica(db: Session) -> VistaPublica:
    return obtener_o_crear_vista(db)


def _obtener_vista_por_token(db: Session, token: str) -> VistaPublica:
    vista = db.scalar(select(VistaPublica).where(VistaPublica.token == token))
    if vista is None:
        raise exceptions.VistaPublicaNoEncontrada()
    return vista


def _construir_indicadores(
    db: Session,
) -> schemas.IndicadoresPublicos:
    hoy = date.today()
    hasta = hoy - timedelta(days=1)
    desde = hasta - timedelta(days=constants.DIAS_VENTANA_CUMPLIMIENTO - 1)

    resumen_tareas = calcular_resumen_tareas(db, desde, hasta)
    resumen_vencimientos = calcular_resumen_vencimientos(db, hoy)

    categorias = [
        schemas.CategoriaVencimientosPublica(
            categoria=resumen.categoria,
            nombre=ETIQUETA_CATEGORIA[resumen.categoria.value],
            total=resumen.total,
            vencidos=resumen.vencidos,
            proximos=resumen.proximos,
            vigentes=resumen.vigentes,
        )
        for resumen in resumen_vencimientos
    ]

    return schemas.IndicadoresPublicos(
        periodo=schemas.PeriodoPublico(desde=desde, hasta=hasta),
        metricas=schemas.MetricasPublicas(
            total_tareas=resumen_tareas.total_tareas,
            completadas=resumen_tareas.completadas,
            incumplidas=resumen_tareas.incumplidas,
            porcentaje_cumplimiento=resumen_tareas.porcentaje_cumplimiento,
        ),
        vencimientos=schemas.VencimientosPublicos(
            total=sum(categoria.total for categoria in categorias),
            vencidos=sum(categoria.vencidos for categoria in categorias),
            proximos=sum(categoria.proximos for categoria in categorias),
            vigentes=sum(categoria.vigentes for categoria in categorias),
            por_categoria=categorias,
        ),
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

    return schemas.RespuestaIndicadoresPublicos(
        activo=True,
        mensaje=None,
        indicadores=_construir_indicadores(db),
    )
