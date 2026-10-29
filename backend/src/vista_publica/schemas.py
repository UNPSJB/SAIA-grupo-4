"""Schemas de la vista publica.

El contrato publico es deliberadamente cerrado: no expone incidentes, datos
internos, IDs, conceptos ni rutas de detalle. Tampoco publica conteos negativos:
solo indicadores agregados y positivos.
"""

from datetime import date

from pydantic import BaseModel


class VistaPublicaEstado(BaseModel):
    activo: bool
    token: str


class VistaPublicaUpdate(BaseModel):
    activo: bool


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
    al_dia: int
    total: int
    porcentaje_al_dia: float
    por_categoria: list[CategoriaVencimientosPublica]


class IndicadoresPublicos(BaseModel):
    periodo: PeriodoPublico
    metricas: MetricasPublicas
    vencimientos: VencimientosPublicos


class RespuestaIndicadoresPublicos(BaseModel):
    activo: bool
    mensaje: str | None = None
    indicadores: IndicadoresPublicos | None = None
