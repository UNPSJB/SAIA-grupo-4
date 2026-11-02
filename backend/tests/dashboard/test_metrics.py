"""Tests de los cálculos agregados compartidos por dashboard y vista pública."""

from datetime import date

from src.dashboard.metrics import (
    CATEGORIAS_VENCIMIENTOS,
    calcular_resumen_tareas,
    calcular_resumen_vencimientos,
)
from tests.database import session  # noqa: F401


def test_resumen_tareas_sin_datos(session):
    resumen = calcular_resumen_tareas(session, date(2026, 1, 1), date(2026, 1, 31))

    assert resumen.total_tareas == 0
    assert resumen.completadas == 0
    assert resumen.incumplidas == 0
    assert resumen.pendientes == 0
    assert resumen.porcentaje_cumplimiento == 0.0


def test_resumen_vencimientos_incluye_todas_las_categorias(session):
    resumenes = calcular_resumen_vencimientos(session)

    assert [resumen.categoria for resumen in resumenes] == list(CATEGORIAS_VENCIMIENTOS)
    assert all(resumen.total == 0 for resumen in resumenes)
    assert all(resumen.vencidos == 0 for resumen in resumenes)
    assert all(resumen.proximos == 0 for resumen in resumenes)
    assert all(resumen.vigentes == 0 for resumen in resumenes)
