"""Tests de filtros y período de GET /dashboard/.

Verifican que `desde` y `hasta` se apliquen igual a tareas, incidentes y
lotes, que los límites sean inclusivos y cómo responde el endpoint ante
rangos vacíos o inválidos.
"""

from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from src.checklists.constants import EstadoEjecucion
from src.main import app
from tests.dashboard.test_dashboard_contrato import (
    _crear_ejecuciones,
    _crear_equipo,
    _crear_incidente,
    _crear_lote,
    _crear_producto_con_receta,
    _crear_tipo,
    _get_dashboard,
    _tarjeta,
)
from tests.database import session  # noqa: F401

client = TestClient(app)

DESDE = date(2026, 3, 10)
HASTA = date(2026, 3, 20)
RANGO = {"desde": DESDE.isoformat(), "hasta": HASTA.isoformat()}

def _total_tareas(data: dict) -> float:
    return sum(d["valor"] for d in data["graficos"]["tareas"]["datos"])

def _total_incidentes(data: dict) -> float:
    return sum(d["valor"] for d in data["graficos"]["incidentes"]["datos"])

def _total_lotes(data: dict) -> float:
    return _tarjeta(data, "lotes")["valor"]

def _crear_tarea_en(db, fecha: date, estado=EstadoEjecucion.COMPLETADA) -> None:
    _crear_ejecuciones(db, [estado], fecha_base=fecha)

def _crear_incidentes_en(db, fechas: list[datetime]) -> None:
    tipo = _crear_tipo(db, "Higiene")
    for fecha in fechas:
        _crear_incidente(db, tipo, abierto=True, fecha=fecha)

def _crear_lotes_en(db, fechas: list[datetime]) -> None:
    producto, receta = _crear_producto_con_receta(db, "Pan")
    for i, fecha in enumerate(fechas):
        _crear_lote(db, f"L-{i}", producto, receta, "1", fecha)

# Un registro antes, uno dentro y uno después del rango para cada métrica.
def _crear_datos_antes_dentro_despues(db) -> None:
    _crear_tarea_en(db, date(2026, 3, 1))
    _crear_tarea_en(db, date(2026, 3, 15))
    _crear_tarea_en(db, date(2026, 3, 30))
    _crear_incidentes_en(db, [
        datetime(2026, 3, 1, 12, 0),
        datetime(2026, 3, 15, 12, 0),
        datetime(2026, 3, 30, 12, 0),
    ])
    _crear_lotes_en(db, [
        datetime(2026, 3, 1, 8, 0),
        datetime(2026, 3, 15, 8, 0),
        datetime(2026, 3, 30, 8, 0),
    ])

# Tests sin filtro y con rango
class TestRango:
    def test_sin_filtro_cuenta_todo(self, session):
        _crear_datos_antes_dentro_despues(session)
        data = _get_dashboard()
        assert _total_tareas(data) == 3
        assert _total_incidentes(data) == 3
        assert _total_lotes(data) == 3

    def test_rango_se_aplica_a_todas_las_metricas(self, session):
        _crear_datos_antes_dentro_despues(session)
        data = _get_dashboard(**RANGO)
        assert _total_tareas(data) == 1
        assert _total_incidentes(data) == 1
        assert _total_lotes(data) == 1

    def test_respuesta_devuelve_el_rango_pedido(self):
        data = _get_dashboard(**RANGO)
        assert data["desde"] == "2026-03-10"
        assert data["hasta"] == "2026-03-20"

    def test_solo_desde(self, session):
        _crear_datos_antes_dentro_despues(session)
        data = _get_dashboard(desde=DESDE.isoformat())
        assert _total_tareas(data) == 2
        assert _total_incidentes(data) == 2
        assert _total_lotes(data) == 2
        assert data["hasta"] is None

    def test_solo_hasta(self, session):
        _crear_datos_antes_dentro_despues(session)
        data = _get_dashboard(hasta=HASTA.isoformat())
        assert _total_tareas(data) == 2
        assert _total_incidentes(data) == 2
        assert _total_lotes(data) == 2
        assert data["desde"] is None

    def test_rango_de_un_solo_dia(self, session):
        _crear_datos_antes_dentro_despues(session)
        dia = date(2026, 3, 15).isoformat()
        data = _get_dashboard(desde=dia, hasta=dia)
        assert _total_tareas(data) == 1
        assert _total_incidentes(data) == 1
        assert _total_lotes(data) == 1

# Tests de las fechas límite (inclusivas)
class TestLimites:
    def test_tareas_en_los_extremos_se_cuentan(self, session):
        _crear_tarea_en(session, DESDE)
        _crear_tarea_en(session, HASTA)
        assert _total_tareas(_get_dashboard(**RANGO)) == 2

    def test_tareas_un_dia_afuera_no_se_cuentan(self, session):
        _crear_tarea_en(session, date(2026, 3, 9))
        _crear_tarea_en(session, date(2026, 3, 21))
        assert _total_tareas(_get_dashboard(**RANGO)) == 0

    def test_incidentes_en_el_primer_y_ultimo_instante(self, session):
        _crear_incidentes_en(session, [
            datetime(2026, 3, 10, 0, 0, 0),
            datetime(2026, 3, 20, 23, 59, 59),
        ])
        assert _total_incidentes(_get_dashboard(**RANGO)) == 2

    def test_incidentes_un_segundo_afuera_no_se_cuentan(self, session):
        _crear_incidentes_en(session, [
            datetime(2026, 3, 9, 23, 59, 59),
            datetime(2026, 3, 21, 0, 0, 0),
        ])
        assert _total_incidentes(_get_dashboard(**RANGO)) == 0

    def test_lotes_en_el_primer_y_ultimo_instante(self, session):
        _crear_lotes_en(session, [
            datetime(2026, 3, 10, 0, 0, 0),
            datetime(2026, 3, 20, 23, 59, 59),
        ])
        assert _total_lotes(_get_dashboard(**RANGO)) == 2

    def test_lotes_un_segundo_afuera_no_se_cuentan(self, session):
        _crear_lotes_en(session, [
            datetime(2026, 3, 9, 23, 59, 59),
            datetime(2026, 3, 21, 0, 0, 0),
        ])
        assert _total_lotes(_get_dashboard(**RANGO)) == 0

# Tests de rangos sin resultados
class TestRangoSinResultados:
    def test_todas_las_metricas_en_cero(self, session):
        _crear_datos_antes_dentro_despues(session)
        data = _get_dashboard(desde="2025-01-01", hasta="2025-01-31")
        for key in ("tareas", "incidentes", "lotes"):
            assert _tarjeta(data, key)["valor"] == 0, key
            assert data["graficos"][key]["datos"] == [], key

    def test_detalle_explica_que_no_hay_datos_en_el_rango(self, session):
        _crear_datos_antes_dentro_despues(session)
        data = _get_dashboard(desde="2025-01-01", hasta="2025-01-31")
        assert "Sin ejecuciones programadas en el rango" in _tarjeta(data, "tareas")["detalle"]
        assert "Sin lotes producidos en el rango" in _tarjeta(data, "lotes")["detalle"]
        assert "0 de 0" in _tarjeta(data, "incidentes")["detalle"]

# Tests de parámetros inválidos
class TestParametrosInvalidos:
    @pytest.mark.parametrize("params", [
        {"desde": "abc"},
        {"hasta": "2026-13-01"},
        {"desde": "10/03/2026"},
    ])
    def test_fecha_con_formato_invalido_devuelve_422(self, params):
        assert client.get("/dashboard/", params=params).status_code == 422

    def test_desde_mayor_que_hasta_devuelve_400(self):
        res = client.get("/dashboard/", params={"desde": "2026-03-20", "hasta": "2026-03-10"})
        assert res.status_code == 400
        assert res.json()["detail"] == "La fecha 'desde' no puede ser mayor a la fecha 'hasta'."

# Tests de vencimientos frente al rango
class TestVencimientos:
    def test_vencimientos_no_dependen_del_rango(self, session):
        # Documenta el comportamiento actual: los vencimientos se calculan
        # al día de hoy y el rango no los modifica. Si se decide que usen
        # `hasta` como fecha de referencia, este test debe cambiar.
        _crear_equipo(session, "EQ-1", dias_restantes=-5)
        _crear_equipo(session, "EQ-2", dias_restantes=40)
        sin_filtro = _get_dashboard()
        con_rango = _get_dashboard(desde="2020-01-01", hasta="2020-01-31")
        assert (
            sin_filtro["graficos"]["vencimientos_equipos"]
            == con_rango["graficos"]["vencimientos_equipos"]
        )
        assert (
            _tarjeta(sin_filtro, "vencimientos_equipos")
            == _tarjeta(con_rango, "vencimientos_equipos")
        )
