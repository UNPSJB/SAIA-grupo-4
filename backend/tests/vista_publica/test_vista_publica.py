"""Tests del modulo de vista publica.

Cubren el ciclo de activacion, el contrato publico y la privacidad de la
respuesta: nunca debe incluir incidentes, datos internos ni identificar al
personal. El contrato publico solo expone indicadores agregados y positivos.
"""

import json
from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient

from src.checklists.constants import EstadoEjecucion
from src.checklists.models import EjecucionTarea
from src.documentos_personal.models import DocumentoPersonal
from src.equipos.models import Equipo
from src.incidentes.models import Incidente
from src.main import app
from src.personal.models import Persona, VencimientoPersonal
from src.plan_poes.models import PlanPOES, TareaPOES
from src.sectores.models import Sector
from src.tipo_incidente.models import TipoIncidente
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

    plan = PlanPOES(nombre="Plan vista publica", elaborado_por_id=persona.id, activo=True)
    db.add(plan)
    db.flush()

    tarea = TareaPOES(
        plan_id=plan.id,
        nombre="Tarea de prueba",
        tipo_poes="operacional",
        frecuencia="diaria",
        metodo="Metodo de prueba",
        activo=True,
    )
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return tarea.id


def _crear_equipo(
    db,
    nombre: str,
    numero_serie: str,
    fecha_ultima_calibracion: date,
    frecuencia_dias: int = 30,
) -> None:
    sector = Sector(nombre=f"Sector {numero_serie}")
    db.add(sector)
    db.flush()

    db.add(
        Equipo(
            nombre=nombre,
            marca="Marca de prueba",
            numero_serie=numero_serie,
            categoria="balanza",
            sector_id=sector.id,
            activo=True,
            frecuencia_calibracion_dias=frecuencia_dias,
            fecha_ultima_calibracion=fecha_ultima_calibracion,
        )
    )


def _crear_persona_con_documento(
    db,
    nombre: str,
    apellido: str,
    dni: str,
    legajo: int,
    fecha_vencimiento: date,
) -> None:
    persona = Persona(
        nombre=nombre,
        apellido=apellido,
        dni=dni,
        legajo=legajo,
        activo=True,
    )
    documento = DocumentoPersonal(
        nombre=f"Documento {dni}",
        vigencia_dias=365,
        activo=True,
    )
    db.add_all([persona, documento])
    db.flush()

    db.add(
        VencimientoPersonal(
            persona_id=persona.id,
            documento_id=documento.id,
            fecha_vencimiento=fecha_vencimiento,
        )
    )
    db.commit()


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
        assert data.get("indicadores") is None

    def test_desactivar_corta_el_acceso_inmediatamente(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)
        assert client.get(f"/publico/{token}/indicadores").json()["activo"] is True

        _activar(False)
        res = client.get(f"/publico/{token}/indicadores")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["activo"] is False
        assert data.get("indicadores") is None
        assert data.get("mensaje") == "La vista pública está desactivada."

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
        assert data.get("mensaje") is None
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

    def test_contrato_publico_es_cerrado_y_sin_conteos_negativos(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        data = client.get(f"/publico/{token}/indicadores").json()
        indicadores = data["indicadores"]

        assert set(indicadores) == {"periodo", "metricas", "vencimientos"}
        assert set(indicadores["metricas"]) == {
            "porcentaje_cumplimiento",
            "tareas_completadas",
            "tareas_totales",
        }
        assert set(indicadores["vencimientos"]) == {
            "al_dia",
            "total",
            "porcentaje_al_dia",
            "por_categoria",
        }

        categorias = indicadores["vencimientos"]["por_categoria"]
        assert len(categorias) == 4
        assert {categoria["nombre"] for categoria in categorias} == {
            "Personal",
            "Equipos",
            "Documentos",
            "Elementos de limpieza",
        }
        for categoria in categorias:
            assert set(categoria) == {
                "nombre",
                "al_dia",
                "total",
                "porcentaje_al_dia",
            }

        payload = json.dumps(data, ensure_ascii=False).lower()
        for prohibido in (
            "incumplida",
            "vencido",
            "proximo",
            "incidente",
            "no conformidad",
            "no_conformidad",
            "titulo",
            "detalle",
            "ruta_detalle",
            "concepto",
            "entidad_id",
            '"link"',
            "dni",
            "legajo",
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

        data = client.get(f"/publico/{token}/indicadores").json()
        metricas = data["indicadores"]["metricas"]

        assert metricas == {
            "porcentaje_cumplimiento": 50.0,
            "tareas_completadas": 1,
            "tareas_totales": 2,
        }

        payload = json.dumps(data, ensure_ascii=False)
        assert "Operador" not in payload
        assert "Vista Publica" not in payload

    def test_porcentaje_equipos_al_dia(self, session):
        hoy = date.today()
        _crear_equipo(
            session,
            nombre="Equipo al dia",
            numero_serie="SN-AL-DIA",
            fecha_ultima_calibracion=hoy - timedelta(days=5),
        )
        _crear_equipo(
            session,
            nombre="Equipo vencido",
            numero_serie="SN-VENCIDO",
            fecha_ultima_calibracion=hoy - timedelta(days=40),
        )
        session.commit()

        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        vencimientos = client.get(f"/publico/{token}/indicadores").json()["indicadores"][
            "vencimientos"
        ]
        equipos = next(
            categoria
            for categoria in vencimientos["por_categoria"]
            if categoria["nombre"] == "Equipos"
        )

        assert equipos == {
            "nombre": "Equipos",
            "al_dia": 1,
            "total": 2,
            "porcentaje_al_dia": 50.0,
        }
        assert vencimientos["al_dia"] == 1
        assert vencimientos["total"] == 2
        assert vencimientos["porcentaje_al_dia"] == 50.0

    def test_personal_se_publica_agregado_y_sin_identificar(self, session):
        _crear_persona_con_documento(
            session,
            nombre="Nombre Secreto",
            apellido="Apellido Secreto",
            dni="39000002",
            legajo=990002,
            fecha_vencimiento=date.today() + timedelta(days=100),
        )

        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        data = client.get(f"/publico/{token}/indicadores").json()
        personal = next(
            categoria
            for categoria in data["indicadores"]["vencimientos"]["por_categoria"]
            if categoria["nombre"] == "Personal"
        )

        assert personal == {
            "nombre": "Personal",
            "al_dia": 1,
            "total": 1,
            "porcentaje_al_dia": 100.0,
        }

        payload = json.dumps(data, ensure_ascii=False)
        assert "Nombre Secreto" not in payload
        assert "Apellido Secreto" not in payload
        assert "39000002" not in payload
        assert "990002" not in payload


CLAVES_CATALOGO = {
    "cumplimiento_tareas",
    "vencimientos_resumen",
    "vencimientos_equipos",
    "vencimientos_documentos",
    "vencimientos_elementos_limpieza",
    "vencimientos_personal",
    "incidentes",
}


def _crear_datos_incidentes(db) -> None:
    """Crea 3 incidentes en la ventana: 2 abiertos y 1 cerrado."""
    reportante = Persona(
        nombre="Reportante",
        apellido="Secreto",
        dni="39000003",
        legajo=990003,
        activo=True,
    )
    tipo = TipoIncidente(
        nombre="Tipo Secreto",
        descripcion="Descripción interna del tipo",
        activo=True,
    )
    db.add_all([reportante, tipo])
    db.flush()

    for indice, abierto in enumerate((True, True, False)):
        db.add(
            Incidente(
                titulo=f"Incidente Secreto {indice}",
                descripcion="Descripción interna del incidente",
                fecha_hora_reporte=datetime.now() - timedelta(days=2),
                reportante_id=reportante.id,
                tipo_id=tipo.id,
                abierto=abierto,
            )
        )
    db.commit()


def _guardar_indicadores(activos: list[str]) -> dict:
    res = client.put("/vista-publica/indicadores", json={"activos": activos})
    assert res.status_code == 200, res.text
    return res.json()


class TestIndicadoresConfigurables:
    def test_get_admin_devuelve_catalogo_con_defaults(self):
        data = client.get("/vista-publica/").json()
        assert {indicador["clave"] for indicador in data["indicadores"]} == (
            CLAVES_CATALOGO
        )

        por_clave = {
            indicador["clave"]: indicador for indicador in data["indicadores"]
        }
        incidentes = por_clave["incidentes"]
        assert incidentes["activo"] is False
        assert incidentes["por_defecto"] is False
        assert incidentes["sensible"] is True

        for clave in CLAVES_CATALOGO - {"incidentes"}:
            indicador = por_clave[clave]
            assert indicador["activo"] is True
            assert indicador["por_defecto"] is True
            assert indicador["sensible"] is False

        for indicador in data["indicadores"]:
            assert set(indicador) == {
                "clave",
                "nombre",
                "descripcion",
                "por_defecto",
                "sensible",
                "activo",
            }

    def test_put_guarda_y_se_refleja_en_el_get(self):
        activos = [
            "cumplimiento_tareas",
            "vencimientos_equipos",
            "incidentes",
        ]
        data = _guardar_indicadores(activos)
        estados = {
            indicador["clave"]: indicador["activo"]
            for indicador in data["indicadores"]
        }

        assert {clave for clave, activo in estados.items() if activo} == set(
            activos
        )
        assert {
            indicador["clave"]: indicador["activo"]
            for indicador in client.get("/vista-publica/").json()["indicadores"]
        } == estados

    def test_put_rechaza_clave_desconocida(self):
        res = client.put(
            "/vista-publica/indicadores",
            json={"activos": ["cumplimiento_tareas", "no_existe"]},
        )
        assert res.status_code == 400
        assert res.json()["detail"] == (
            "Uno o más indicadores no existen en el catálogo de la vista pública."
        )

    def test_por_defecto_no_expone_incidentes(self, session):
        _crear_datos_incidentes(session)
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        data = client.get(f"/publico/{token}/indicadores").json()
        assert "incidentes" not in data["indicadores"]
        assert "Incidente Secreto" not in json.dumps(data, ensure_ascii=False)

    def test_incidentes_solo_expone_totales_globales(self, session):
        _crear_datos_incidentes(session)
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)
        _guardar_indicadores(["incidentes"])

        data = client.get(f"/publico/{token}/indicadores").json()
        indicadores = data["indicadores"]

        assert set(indicadores) == {"periodo", "incidentes"}
        assert indicadores["incidentes"] == {
            "total": 3,
            "abiertos": 2,
            "cerrados": 1,
            "porcentaje_cerrados": 33.3,
        }

        payload = json.dumps(data, ensure_ascii=False).lower()
        for prohibido in (
            "titulo",
            "reportante",
            "secreto",
            "dni",
            "legajo",
            "accion_correctiva",
            "tipo secreto",
            "fecha_hora_reporte",
            "descripcion",
        ):
            assert prohibido not in payload

    def test_apagar_una_categoria_la_quita_de_la_respuesta(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)
        _guardar_indicadores(["vencimientos_personal"])

        indicadores = client.get(f"/publico/{token}/indicadores").json()[
            "indicadores"
        ]

        assert set(indicadores) == {"periodo", "vencimientos"}
        assert set(indicadores["vencimientos"]) == {"por_categoria"}
        assert [
            categoria["nombre"]
            for categoria in indicadores["vencimientos"]["por_categoria"]
        ] == ["Personal"]

    def test_resumen_y_categorias_se_configuran_independientemente(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        _guardar_indicadores(["vencimientos_equipos"])
        vencimientos = client.get(f"/publico/{token}/indicadores").json()[
            "indicadores"
        ]["vencimientos"]
        assert set(vencimientos) == {"por_categoria"}
        assert vencimientos["por_categoria"][0]["nombre"] == "Equipos"

        _guardar_indicadores(["vencimientos_resumen"])
        vencimientos = client.get(f"/publico/{token}/indicadores").json()[
            "indicadores"
        ]["vencimientos"]
        assert set(vencimientos) == {
            "al_dia",
            "total",
            "porcentaje_al_dia",
        }

    def test_todos_apagados_devuelve_solo_periodo(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)
        _guardar_indicadores([])

        data = client.get(f"/publico/{token}/indicadores").json()

        assert data["activo"] is True
        assert set(data["indicadores"]) == {"periodo"}

    def test_los_cambios_se_reflejan_sin_cache(self):
        token = client.get("/vista-publica/").json()["token"]
        _activar(True)

        assert "incidentes" not in client.get(
            f"/publico/{token}/indicadores"
        ).json()["indicadores"]

        _guardar_indicadores(["incidentes"])

        res = client.get(f"/publico/{token}/indicadores")
        assert "incidentes" in res.json()["indicadores"]
        assert res.headers["cache-control"] == "no-store"

        _guardar_indicadores([])
        assert "incidentes" not in client.get(
            f"/publico/{token}/indicadores"
        ).json()["indicadores"]
