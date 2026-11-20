"""Tests del contrato de GET /dashboard/.

Verifican que la respuesta tenga la forma que consumen la pantalla y el
informe: claves exactas, campos de cada tarjeta, gráficos con leyendas y
valores que coinciden con los datos cargados.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.checklists.constants import EstadoEjecucion
from src.checklists.models import EjecucionTarea
from src.equipos.models import Equipo
from src.incidentes.models import Incidente
from src.lotes.models import Lote
from src.main import app
from src.personal.models import Persona
from src.plan_poes.models import PlanPOES, TareaPOES
from src.productos.models import Producto
from src.recetas.models import Receta
from src.sectores.models import Sector
from src.tipo_incidente.models import TipoIncidente
from src.unidad_medida.models import UnidadMedida
from tests.database import session  # noqa: F401

client = TestClient(app)

CLAVES_VENCIMIENTOS = {
    "vencimientos_equipos",
    "vencimientos_personal",
    "vencimientos_documentos",
    "vencimientos_elementos_limpieza",
}
CLAVES_ESPERADAS = CLAVES_VENCIMIENTOS | {"incidentes", "tareas", "lotes"}
CAMPOS_TARJETA = {"key", "titulo", "valor", "unidad", "detalle", "link"}
CAMPOS_GRAFICO = {"tipo", "datos", "leyendas"}

def _get_dashboard(**params) -> dict:
    res = client.get("/dashboard/", params=params)
    assert res.status_code == 200, res.text
    return res.json()

def _tarjeta(data: dict, key: str) -> dict:
    return next(t for t in data["tarjetas"] if t["key"] == key)

def _admin(db) -> Persona:
    return db.scalar(select(Persona).where(Persona.legajo == 1000000))

def _crear_tarea(db) -> int:
    admin = _admin(db)
    plan = PlanPOES(nombre="Plan dashboard", elaborado_por_id=admin.id, activo=True)
    db.add(plan)
    db.flush()
    tarea = TareaPOES(
        plan_id=plan.id,
        nombre="Tarea dashboard",
        tipo_poes="operacional",
        frecuencia="diaria",
        metodo="Metodo",
        activo=True,
    )
    db.add(tarea)
    db.commit()
    return tarea.id

def _crear_ejecuciones(db, estados: list[EstadoEjecucion], fecha_base: date) -> None:
    tarea_id = _crear_tarea(db)
    # Una ejecución por día: la tarea no admite dos ejecuciones el mismo día.
    for i, estado in enumerate(estados):
        db.add(
            EjecucionTarea(
                id_tarea=tarea_id,
                fecha_programada=fecha_base + timedelta(days=i),
                estado=estado,
            )
        )
    db.commit()

def _crear_tipo(db, nombre: str, activo: bool = True) -> int:
    tipo = TipoIncidente(nombre=nombre, descripcion=f"Tipo {nombre}", activo=activo)
    db.add(tipo)
    db.commit()
    return tipo.id

def _crear_incidente(db, tipo_id: int, abierto: bool, fecha: datetime) -> None:
    db.add(
        Incidente(
            titulo="Incidente",
            descripcion="Descripcion",
            fecha_hora_reporte=fecha,
            reportante_id=_admin(db).id,
            tipo_id=tipo_id,
            abierto=abierto,
        )
    )
    db.commit()

def _crear_producto_con_receta(db, nombre: str, simbolo: str = "kg") -> tuple[int, int]:
    unidad = UnidadMedida(nombre=f"Unidad {nombre}", simbolo=simbolo, tipo_magnitud="masa")
    db.add(unidad)
    db.flush()
    producto = Producto(nombre=nombre, descripcion=nombre, unidad_medida_id=unidad.id)
    db.add(producto)
    db.flush()
    receta = Receta(
        codigo_receta=f"REC-{nombre}",
        nombre_receta=f"Receta {nombre}",
        producto_id=producto.id,
        rendimiento_estandar=Decimal("10"),
        usuario_creador_id=_admin(db).id,
    )
    db.add(receta)
    db.commit()
    return producto.id, receta.id

def _crear_lote(db, codigo: str, producto_id: int, receta_id: int, cantidad: str, fecha: datetime) -> None:
    db.add(
        Lote(
            codigo_lote=codigo,
            producto_id=producto_id,
            receta_id=receta_id,
            operador_id=_admin(db).id,
            fecha_elaboracion=fecha,
            fecha_vencimiento=fecha.date() + timedelta(days=30),
            cantidad_producida=Decimal(cantidad),
        )
    )
    db.commit()

def _crear_equipo(db, serie: str, dias_restantes: int) -> None:
    """Crea un equipo cuya próxima calibración vence en `dias_restantes` días."""
    frecuencia = 60
    sector = Sector(nombre=f"Sector {serie}")
    db.add(sector)
    db.flush()
    db.add(
        Equipo(
            nombre=f"Equipo {serie}",
            marca="Marca",
            numero_serie=serie,
            categoria="balanza",
            sector_id=sector.id,
            activo=True,
            frecuencia_calibracion_dias=frecuencia,
            fecha_ultima_calibracion=date.today() - timedelta(days=frecuencia - dias_restantes),
        )
    )
    db.commit()

# Tests de las respuestas

class TestEstructura:
    def test_claves_de_primer_nivel(self):
        data = _get_dashboard()
        assert set(data) == {"desde", "hasta", "tarjetas", "graficos", "totales"}

    def test_tarjetas_tienen_exactamente_las_metricas_esperadas(self):
        data = _get_dashboard()
        keys = [t["key"] for t in data["tarjetas"]]
        assert len(keys) == len(set(keys)), "Hay tarjetas duplicadas"
        assert set(keys) == CLAVES_ESPERADAS

    def test_cada_tarjeta_tiene_su_grafico(self):
        data = _get_dashboard()
        assert set(data["graficos"]) == {t["key"] for t in data["tarjetas"]}

    def test_campos_y_tipos_de_cada_tarjeta(self):
        data = _get_dashboard()
        for tarjeta in data["tarjetas"]:
            assert set(tarjeta) == CAMPOS_TARJETA, tarjeta["key"]
            assert isinstance(tarjeta["titulo"], str) and tarjeta["titulo"]
            assert isinstance(tarjeta["valor"], (int, float))
            assert tarjeta["unidad"] in {"porcentaje", "cantidad"}
            assert isinstance(tarjeta["detalle"], str) and tarjeta["detalle"]
            assert tarjeta["link"] is None or tarjeta["link"].startswith("/")

    def test_unidades_y_links_por_metrica(self):
        data = _get_dashboard()
        for key in CLAVES_VENCIMIENTOS:
            assert _tarjeta(data, key)["unidad"] == "porcentaje"
            assert _tarjeta(data, key)["link"] == "/vencimientos"
        assert _tarjeta(data, "incidentes")["unidad"] == "porcentaje"
        assert _tarjeta(data, "incidentes")["link"] == "/incidentes"
        assert _tarjeta(data, "tareas")["unidad"] == "porcentaje"
        assert _tarjeta(data, "tareas")["link"] == "/historial"
        assert _tarjeta(data, "lotes")["unidad"] == "cantidad"
        assert _tarjeta(data, "lotes")["link"] == "/historial-lotes"

    def test_graficos_tienen_tipo_valido_y_leyendas(self):
        data = _get_dashboard()
        for key, grafico in data["graficos"].items():
            assert set(grafico) == CAMPOS_GRAFICO, key
            assert grafico["tipo"] in {"pie", "donut", "bar"}
            assert isinstance(grafico["datos"], list)
            assert len(grafico["leyendas"]) > 0, key
            for leyenda in grafico["leyendas"]:
                assert isinstance(leyenda["label"], str) and leyenda["label"]

    def test_porcentajes_entre_0_y_100(self):
        data = _get_dashboard()
        for tarjeta in data["tarjetas"]:
            if tarjeta["unidad"] == "porcentaje":
                assert 0 <= tarjeta["valor"] <= 100, tarjeta["key"]

    def test_sin_filtro_desde_y_hasta_son_null(self):
        data = _get_dashboard()
        assert data["desde"] is None
        assert data["hasta"] is None

# Tests de las respuestas cuando no hay datos

class TestSinDatos:
    def test_todas_las_metricas_en_cero_y_graficos_vacios(self):
        data = _get_dashboard()
        for tarjeta in data["tarjetas"]:
            assert tarjeta["valor"] == 0, tarjeta["key"]
        for key, grafico in data["graficos"].items():
            assert grafico["datos"] == [], key

    @pytest.mark.parametrize(
        "key, texto",
        [
            ("vencimientos_equipos", "Sin vencimientos registrados"),
            ("tareas", "Sin ejecuciones programadas"),
            ("lotes", "Sin lotes producidos"),
            ("incidentes", "0 de 0"),
        ],
    )
    def test_detalle_explica_que_no_hay_datos(self, key, texto):
        assert texto in _tarjeta(_get_dashboard(), key)["detalle"]

# Tests de las respuestas cuando hay datos

class TestValoresConDatos:
    def test_tareas_porcentaje_y_grafico(self, session):
        _crear_ejecuciones(
            session,
            [
                EstadoEjecucion.COMPLETADA,
                EstadoEjecucion.COMPLETADA,
                EstadoEjecucion.NO_REALIZADA,
                EstadoEjecucion.PENDIENTE,
            ],
            fecha_base=date(2026, 3, 1),
        )
        data = _get_dashboard()

        tarjeta = _tarjeta(data, "tareas")
        # Las pendientes no cuentan para el porcentaje: 2 de 3 cerradas.
        assert tarjeta["valor"] == 66.7
        assert "2 de 3" in tarjeta["detalle"]
        assert "1 aún pendientes" in tarjeta["detalle"]

        grafico = data["graficos"]["tareas"]
        valores = {d["label"]: d["valor"] for d in grafico["datos"]}
        assert valores == {"Completadas": 2, "No realizadas": 1, "Pendientes": 1}
        # Cada leyenda acompaña a su dato con el mismo valor.
        assert [l["valor"] for l in grafico["leyendas"]] == [d["valor"] for d in grafico["datos"]]

    def test_tareas_solo_pendientes(self, session):
        _crear_ejecuciones(session, [EstadoEjecucion.PENDIENTE], fecha_base=date(2026, 3, 1))
        tarjeta = _tarjeta(_get_dashboard(), "tareas")
        assert tarjeta["valor"] == 0
        assert "1 tareas pendientes" in tarjeta["detalle"]

    def test_incidentes_porcentaje_y_suma_del_grafico(self, session):
        fecha = datetime(2026, 3, 10, 12, 0)
        higiene = _crear_tipo(session, "Higiene")
        plagas = _crear_tipo(session, "Plagas")
        _crear_incidente(session, higiene, abierto=False, fecha=fecha)
        _crear_incidente(session, higiene, abierto=True, fecha=fecha)
        _crear_incidente(session, plagas, abierto=True, fecha=fecha)

        data = _get_dashboard()
        tarjeta = _tarjeta(data, "incidentes")
        assert tarjeta["valor"] == 33.3
        assert "1 de 3" in tarjeta["detalle"]

        grafico = data["graficos"]["incidentes"]
        valores = {d["label"]: d["valor"] for d in grafico["datos"]}
        assert valores == {
            "Higiene - Abiertos": 1,
            "Higiene - Cerrados": 1,
            "Plagas - Abiertos": 1,
            "Plagas - Cerrados": 0,
        }
        assert sum(valores.values()) == 3
        assert [l["valor"] for l in grafico["leyendas"]] == [d["valor"] for d in grafico["datos"]]

    def test_incidentes_de_tipo_desactivado_se_siguen_contando(self, session):
        inactivo = _crear_tipo(session, "Obsoleto", activo=False)
        _crear_incidente(session, inactivo, abierto=True, fecha=datetime(2026, 3, 10, 12, 0))

        grafico = _get_dashboard()["graficos"]["incidentes"]
        assert sum(d["valor"] for d in grafico["datos"]) == 1
        assert any(d["label"].startswith("Obsoleto") for d in grafico["datos"])

    def test_lotes_cantidad_y_grafico_por_producto(self, session):
        fecha = datetime(2026, 3, 10, 8, 0)
        pan, receta_pan = _crear_producto_con_receta(session, "Pan", "kg")
        leche, receta_leche = _crear_producto_con_receta(session, "Leche", "l")
        _crear_lote(session, "L-1", pan, receta_pan, "10.50", fecha)
        _crear_lote(session, "L-2", pan, receta_pan, "4.50", fecha)
        _crear_lote(session, "L-3", leche, receta_leche, "20", fecha)

        data = _get_dashboard()
        tarjeta = _tarjeta(data, "lotes")
        assert tarjeta["valor"] == 3
        assert "35.00 unidades" in tarjeta["detalle"]
        assert "3 lotes" in tarjeta["detalle"]

        grafico = data["graficos"]["lotes"]
        assert grafico["tipo"] == "bar"
        # Ordenado por nombre de producto.
        assert [d["valor"] for d in grafico["datos"]] == [20.0, 15.0]
        assert grafico["datos"][0]["label"] == "Leche (20.00 l - 1 lote)"
        assert grafico["datos"][1]["label"] == "Pan (15.00 kg - 2 lotes)"

    def test_vencimientos_equipos_por_estado(self, session):
        _crear_equipo(session, "EQ-VENCIDO", dias_restantes=-5)
        _crear_equipo(session, "EQ-PROXIMO", dias_restantes=5)
        _crear_equipo(session, "EQ-VIGENTE", dias_restantes=40)

        data = _get_dashboard()
        tarjeta = _tarjeta(data, "vencimientos_equipos")
        # Requieren atención: vencidos + próximos = 2 de 3.
        assert tarjeta["valor"] == 66.7
        assert "2 de 3" in tarjeta["detalle"]

        grafico = data["graficos"]["vencimientos_equipos"]
        valores = {d["label"]: d["valor"] for d in grafico["datos"]}
        assert valores == {"Vencidos": 1, "Próximos a vencer": 1, "Vigentes": 1}
        assert [l["valor"] for l in grafico["leyendas"]] == [d["valor"] for d in grafico["datos"]]

        # Las otras categorías no se contaminan con los equipos.
        for key in CLAVES_VENCIMIENTOS - {"vencimientos_equipos"}:
            assert data["graficos"][key]["datos"] == []
