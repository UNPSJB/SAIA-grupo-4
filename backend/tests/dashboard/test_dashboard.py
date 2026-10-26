"""Tests del módulo dashboard.

Se valida autorización, estructura de respuesta, uso de rango de fechas
y que los gráficos incluyan leyendas explicativas.
"""

from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


class TestDashboard:
    """Casos de prueba para GET /dashboard"""

    def test_dashboard_requiere_autenticacion(self):
        """Sin token debe rechazar la petición."""
        resp = client.get("/dashboard/")
        assert resp.status_code in (401, 403)

    def test_dashboard_solo_administrador(self, client_operador):
        """Un usuario con rol operador sin 'administrar' debe recibir 403."""
        resp = client_operador.get("/dashboard/")
        assert resp.status_code == 403

    def test_dashboard_admin_ok(self, client_admin):
        """Un administrador puede acceder y recibe estructura consolidada."""
        resp = client_admin.get("/dashboard/")
        assert resp.status_code == 200
        data = resp.json()

        # Estructura esperada
        assert "tarjetas" in data
        assert "graficos" in data
        assert isinstance(data["tarjetas"], list)
        assert isinstance(data["graficos"], dict)

        # Debe incluir las métricas principales
        keys_tarjetas = {t["key"] for t in data["tarjetas"]}
        assert "vencimientos" in keys_tarjetas
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

    def test_dashboard_con_rango_fechas(self, client_admin):
        """Acepta parámetros desde/hasta sin romper la respuesta."""
        resp = client_admin.get("/dashboard/?desde=2026-01-01&hasta=2026-12-31")
        assert resp.status_code == 200
        data = resp.json()
        assert data["desde"] == "2026-01-01"
        assert data["hasta"] == "2026-12-31"

    def test_dashboard_lotes_no_implementado(self, client_admin):
        """Lotes debe aparecer con valor 0 y detalle 'No implementado' sin link."""
        resp = client_admin.get("/dashboard/")
        data = resp.json()
        lotes = next((t for t in data["tarjetas"] if t["key"] == "lotes"), None)
        assert lotes is not None
        assert lotes["valor"] == 0
        assert lotes["unidad"] == "cantidad"
        assert "no implementado" in lotes["detalle"].lower()
        assert lotes["link"] is None
