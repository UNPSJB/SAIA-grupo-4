"""Tests del módulo de vista pública.

Cubren el ciclo de activación, el contrato público y la privacidad de la
respuesta: nunca debe incluir incidentes ni datos internos.
"""

import json
from datetime import date, timedelta

from fastapi.testclient import TestClient

from src.checklists.constants import EstadoEjecucion
from src.checklists.models import EjecucionTarea
from src.main import app
from src.personal.models import Persona
from src.plan_poes.models import PlanPOES, TareaPOES
from tests.database import session  # noqa: F401

client = TestClient(app)


def _activar(activo: bool = True) -> dict:
    res = client.put("/vista-publica/", json={"activo": activo})
    assert res.status_code == 200, res.text
    return res.json()


def _crear_tarea_base(db) -> int:
    persona = Persona(
        nombre="Operador",
        apellido="Vista Publica",
        dni="39000001",
        legajo=990001,
        activo=True,
    )
    db.add(persona)
    db.flush()

    plan = PlanPOES(nombre="Plan vista pública", elaborado_por_id=persona.id, activo=True)
    db.add(plan)
    db.flush()

    tarea = TareaPOES(
        plan_id=plan.id,
        nombre="Tarea de prueba",
        tipo_poes="operacional",
        frecuencia="diaria",
        metodo="Método de prueba",
        activo=True,
    )
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return tarea.id


class TestVistaPublicaAdmin:
    def test_get_crea_fila_desactivada(self):
        res = client.get("/vista-publica/")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["activo"] is False
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 20
        assert res.headers["cache-control"] == "no-store"

    def test_token_estable_al_activar_y_desactivar(self):
        token_inicial = client.get("/vista-publica/").json()["token"]

        assert _activar(True)["token"] == token_inicial
        assert _activar(False)["token"] == token_inicial
        assert _activar(True)["token"] == token_inicial


class TestVistaPublicaPublica:
    def test_token_inexistente_404(self):
        res = client.get("/publico/token-inexistente/indicadores")
        assert res.status_code == 404
        assert res.json()["detail"] == "La vista pública no existe."

    def test_recien_creada_esta_desactivada(self):
        token = client.get("/vista-publica/").json()["token"]

        data = client.get(f"/publico/{token}/indicadores").json()

        assert data["activo"] is False
        assert data["indicadores"] is None

    def test_desactivar_corta_el_acceso_inmediatamente(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)
        assert client.get(f"/publico/{token}/indicadores").json()["activo"] is True

        _activar(False)
        res = client.get(f"/publico/{token}/indicadores")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["activo"] is False
        assert data["indicadores"] is None
        assert data["mensaje"] == "La vista pública está desactivada."

        # Reactivar reutiliza el mismo token y vuelve a habilitar los indicadores.
        assert _activar(True)["token"] == token
        assert client.get(f"/publico/{token}/indicadores").json()["activo"] is True

    def test_activa_devuelve_indicadores_y_headers_de_privacidad(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        res = client.get(f"/publico/{token}/indicadores")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["activo"] is True
        assert data["mensaje"] is None
        assert data["indicadores"] is not None
        assert res.headers["cache-control"] == "no-store"
        assert res.headers["referrer-policy"] == "no-referrer"
        assert "noindex" in res.headers["x-robots-tag"]

    def test_periodo_son_los_ultimos_30_dias_cerrados(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        data = client.get(f"/publico/{token}/indicadores").json()
        hasta = date.today() - timedelta(days=1)
        desde = hasta - timedelta(days=29)

        assert data["indicadores"]["periodo"]["desde"] == desde.isoformat()
        assert data["indicadores"]["periodo"]["hasta"] == hasta.isoformat()

    def test_contrato_publico_es_cerrado_y_sin_incidentes(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        data = client.get(f"/publico/{token}/indicadores").json()
        indicadores = data["indicadores"]

        assert set(indicadores) == {"periodo", "metricas", "vencimientos"}
        assert set(indicadores["metricas"]) == {
            "total_tareas",
            "completadas",
            "incumplidas",
            "porcentaje_cumplimiento",
        }
        assert set(indicadores["vencimientos"]) == {
            "total",
            "vencidos",
            "proximos",
            "vigentes",
            "por_categoria",
        }

        categorias = indicadores["vencimientos"]["por_categoria"]
        assert len(categorias) == 4
        for categoria in categorias:
            assert set(categoria) == {
                "categoria",
                "nombre",
                "total",
                "vencidos",
                "proximos",
                "vigentes",
            }

        payload = json.dumps(data, ensure_ascii=False).lower()
        for prohibido in (
            "incidente",
            "no conformidad",
            "no_conformidad",
            "titulo",
            "detalle",
            "ruta_detalle",
            "concepto",
            "entidad_id",
            '"link"',
        ):
            assert prohibido not in payload

    def test_metricas_cuentan_solo_tareas_cerradas_del_periodo(self, session):
        tarea_id = _crear_tarea_base(session)
        hoy = date.today()

        session.add_all(
            [
                EjecucionTarea(
                    id_tarea=tarea_id,
                    fecha_programada=hoy - timedelta(days=1),
                    estado=EstadoEjecucion.COMPLETADA,
                ),
                EjecucionTarea(
                    id_tarea=tarea_id,
                    fecha_programada=hoy - timedelta(days=2),
                    estado=EstadoEjecucion.NO_REALIZADA,
                ),
                EjecucionTarea(
                    id_tarea=tarea_id,
                    fecha_programada=hoy - timedelta(days=31),
                    estado=EstadoEjecucion.COMPLETADA,
                ),
                EjecucionTarea(
                    id_tarea=tarea_id,
                    fecha_programada=hoy,
                    estado=EstadoEjecucion.PENDIENTE,
                ),
            ]
        )
        session.commit()

        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        metricas = client.get(f"/publico/{token}/indicadores").json()["indicadores"]["metricas"]

        assert metricas == {
            "total_tareas": 2,
            "completadas": 1,
            "incumplidas": 1,
            "porcentaje_cumplimiento": 50,
        }
