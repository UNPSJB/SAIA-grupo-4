"""Schemas de la vista publica.

El contrato publico es deliberadamente cerrado: no expone datos internos, IDs,
conceptos ni rutas de detalle. Los indicadores que el administrador apaga no
aparecen en la respuesta. Los incidentes, cuando se habilitan, solo se publican
como totales globales.
"""

from datetime import date

from pydantic import BaseModel


class IndicadorCatalogoEstado(BaseModel):
    """Indicador del catálogo con su estado actual."""

    clave: str
    nombre: str
    descripcion: str
    por_defecto: bool
    sensible: bool
    activo: bool


class VistaPublicaEstado(BaseModel):
    activo: bool
    token: str
    indicadores: list[IndicadorCatalogoEstado]


class VistaPublicaUpdate(BaseModel):
    activo: bool


class IndicadoresUpdate(BaseModel):
    activos: list[str]


class MetricasPublicas(BaseModel):
    porcentaje_cumplimiento: float
    tareas_completadas: int
    tareas_totales: int


class PeriodoPublico(BaseModel):
    desde: date
    hasta: date


class CategoriaVencimientosPublica(BaseModel):
    nombre: str
    al_dia: int
    total: int
    porcentaje_al_dia: float


class VencimientosPublicos(BaseModel):
    # Los campos del resumen son opcionales para poder apagar únicamente el
    # resumen general sin apagar las tarjetas por categoría.
    al_dia: int | None = None
    total: int | None = None
    porcentaje_al_dia: float | None = None
    por_categoria: list[CategoriaVencimientosPublica] | None = None


class IncidentesPublicos(BaseModel):
    """Totales globales de incidentes. Sin tipos, fechas ni personas."""

    total: int
    abiertos: int
    cerrados: int
    porcentaje_cerrados: float


class IndicadoresPublicos(BaseModel):
    periodo: PeriodoPublico
    metricas: MetricasPublicas | None = None
    vencimientos: VencimientosPublicos | None = None
    incidentes: IncidentesPublicos | None = None


class RespuestaIndicadoresPublicos(BaseModel):
    activo: bool
    mensaje: str | None = None
    indicadores: IndicadoresPublicos | None = None
