from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

# Explicación de un elemento del gráfico.
class LeyendaItem(BaseModel):
    label: str = Field(description="Descripción clara de qué representa")
    valor: float | None = Field(default=None, description="Valor numérico asociado")

# Dato individual para renderizar en el gráfico.
class GraficoDato(BaseModel):
    label: str
    valor: float

# Configuración completa de un gráfico para el frontend.
class GraficoConfig(BaseModel):
    tipo: Literal["pie", "donut", "bar"] = "pie"
    datos: list[GraficoDato]
    leyendas: list[LeyendaItem] = Field(
        description="Obligatorio. Debe explicar qué significa cada elemento del gráfico."
    )

# Tarjeta resumen de una métrica.
class MetricaCard(BaseModel):
    key: str = Field(description="Identificador único de la métrica")
    titulo: str
    valor: float
    unidad: Literal["porcentaje", "cantidad"] = "porcentaje"
    detalle: str | None = None
    link: str | None = Field(default=None, description="Ruta del frontend para navegar al listado. None si no es navegable.")


# Respuesta única consolidada del dashboard.
class DashboardResponse(BaseModel):
    desde: date | None = None
    hasta: date | None = None
    tarjetas: list[MetricaCard]
    graficos: dict[str, GraficoConfig] = Field(
        description="Clave = métrica (vencimientos, incidentes, tareas, lotes). Valor = configuración con datos + leyendas."
    )
    totales: dict[str, int] | None = None
