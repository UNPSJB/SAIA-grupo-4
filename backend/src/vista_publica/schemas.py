"""Schemas de la vista pública.

El contrato público es deliberadamente cerrado: no expone incidentes, datos
internos, IDs, conceptos ni rutas de detalle.
"""

from datetime import date

from pydantic import BaseModel

from src.vencimientos.constants import CategoriaVencimiento


class VistaPublicaEstado(BaseModel):
    activo: bool
    token: str


class VistaPublicaUpdate(BaseModel):
    activo: bool


class MetricasPublicas(BaseModel):
    total_tareas: int
    completadas: int
    incumplidas: int
    porcentaje_cumplimiento: float


class PeriodoPublico(BaseModel):
    desde: date
    hasta: date


class CategoriaVencimientosPublica(BaseModel):
    categoria: CategoriaVencimiento
    nombre: str
    total: int
    vencidos: int
    proximos: int
    vigentes: int


class VencimientosPublicos(BaseModel):
    total: int
    vencidos: int
    proximos: int
    vigentes: int
    por_categoria: list[CategoriaVencimientosPublica]


class IndicadoresPublicos(BaseModel):
    periodo: PeriodoPublico
    metricas: MetricasPublicas
    vencimientos: VencimientosPublicos


class RespuestaIndicadoresPublicos(BaseModel):
    activo: bool
    mensaje: str | None = None
    indicadores: IndicadoresPublicos | None = None
