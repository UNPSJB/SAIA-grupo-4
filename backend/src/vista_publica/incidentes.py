"""Cálculo de los indicadores públicos de incidentes.

La vista pública solo expone totales globales: no se leen relaciones, títulos,
fechas, personas ni acciones correctivas. El cálculo se hace en cada request.
"""

from dataclasses import dataclass
from datetime import date, datetime, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.incidentes.models import Incidente


@dataclass(frozen=True)
class ResumenIncidentes:
    """Totales globales de incidentes en un período."""

    total: int
    abiertos: int
    cerrados: int
    porcentaje_cerrados: float


def calcular_resumen_incidentes(
    db: Session,
    desde: date,
    hasta: date,
) -> ResumenIncidentes:
    """Cuenta incidentes abiertos y cerrados dentro del período indicado."""

    inicio = datetime.combine(desde, time.min)
    fin = datetime.combine(hasta, time.max)

    estados = db.scalars(
        select(Incidente.abierto).where(
            Incidente.fecha_hora_reporte >= inicio,
            Incidente.fecha_hora_reporte <= fin,
        )
    ).all()

    total = len(estados)
    abiertos = sum(1 for abierto in estados if abierto)
    cerrados = total - abiertos
    porcentaje_cerrados = round((cerrados / total) * 100, 1) if total > 0 else 0.0

    return ResumenIncidentes(
        total=total,
        abiertos=abiertos,
        cerrados=cerrados,
        porcentaje_cerrados=porcentaje_cerrados,
    )
