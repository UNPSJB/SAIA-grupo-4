"""Tests del módulo dashboard.

Se valida estructura de respuesta, uso de rango de fechas
y que los gráficos incluyan leyendas explicativas.
"""

from fastapi.testclient import TestClient

from src.main import app
from tests.database import session  # noqa: F401

client = TestClient(app)


class TestDashboard:
    """Casos de prueba para GET /dashboard"""

    def test_dashboard_admin_ok(self):
        """Un administrador puede acceder y recibe estructura consolidada."""
        resp = client.get("/dashboard/")
        assert resp.status_code == 200
        data = resp.json()

        # Estructura esperada
        assert "tarjetas" in data
        assert "graficos" in data
        assert isinstance(data["tarjetas"], list)
        assert isinstance(data["graficos"], dict)

        # Debe incluir las métricas principales
        keys_tarjetas = {t["key"] for t in data["tarjetas"]}
        # Vencimientos ahora se dividen por categoría
        assert any(k.startswith("vencimientos_") for k in keys_tarjetas)
        assert "incidentes" in keys_tarjetas
        assert "tareas" in keys_tarjetas
        assert "lotes" in keys_tarjetas

        # Los gráficos deben tener leyendas obligatorias
        for key, graf in data["graficos"].items():
            assert "leyendas" in graf
            assert isinstance(graf["leyendas"], list)
            assert len(graf["leyendas"]) > 0
            # Cada leyenda debe explicar algo
            for leyenda in graf["leyendas"]:
                assert "label" in leyenda

    def test_dashboard_con_rango_fechas(self):
        """Acepta parámetros desde/hasta sin romper la respuesta."""
        resp = client.get("/dashboard/?desde=2026-01-01&hasta=2026-12-31")
        assert resp.status_code == 200
        data = resp.json()
        assert data["desde"] == "2026-01-01"
        assert data["hasta"] == "2026-12-31"

