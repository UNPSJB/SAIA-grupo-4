from datetime import date, datetime
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from src.configuracion.models import VersionParametroFrontal
from src.lotes.models import Lote
from src.main import app
from tests.database import session
from src.insumos.models import Insumo
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import PasoInsumo, PasoReceta, Receta
from src.rotulado.constants import (
    CodigoLeyendaPrecautoria,
    CodigoSelloAdvertencia,
    DictamenAplicabilidad,
)
from src.unidad_medida.models import UnidadMedida

client = TestClient(app)


def generar_str(prefijo: str) -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def setup_sellos(session):
    um_masa = UnidadMedida(
        nombre=generar_str("Gramo"),
        simbolo="g",
        tipo_magnitud="masa",
        disponible=True,
    )
    um_vol = UnidadMedida(
        nombre=generar_str("Mililitro"),
        simbolo="ml",
        tipo_magnitud="volumen",
        disponible=True,
    )
    session.add_all([um_masa, um_vol])
    session.commit()
    session.refresh(um_masa)
    session.refresh(um_vol)

    prod_solido = Producto(
        nombre=generar_str("Galleta"),
        descripcion="Producto solido envasado",
        unidad_medida_id=um_masa.id,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_liquido = Producto(
        nombre=generar_str("Bebida"),
        descripcion="Producto liquido envasado",
        unidad_medida_id=um_vol.id,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_a_granel = Producto(
        nombre=generar_str("Pan Mostrador"),
        descripcion="Sin envase en ausencia del cliente",
        unidad_medida_id=um_masa.id,
        envasado_ausencia_cliente=False,
        activo=True,
    )
    session.add_all([prod_solido, prod_liquido, prod_a_granel])
    session.commit()

    return {
        "um_masa": um_masa,
        "um_vol": um_vol,
        "prod_solido": prod_solido,
        "prod_liquido": prod_liquido,
        "prod_a_granel": prod_a_granel,
    }


def _crear_insumo(
    session,
    um_id: int,
    nombre: str,
    *,
    categoria: str = "materia prima",
    clase_funcional: str | None = None,
    densidad_g_ml: float | None = None,
    kcal: float = 0.0,
    carbohidratos: float = 0.0,
    azucares_totales: float = 0.0,
    azucares_anadidos: float = 0.0,
    proteinas: float = 0.0,
    grasas_totales: float = 0.0,
    grasas_saturadas: float = 0.0,
    grasas_trans: float = 0.0,
    fibra: float = 0.0,
    sodio: float = 0.0,
    aporta_azucares: bool = False,
    aporta_grasas: bool = False,
    aporta_sodio: bool = False,
    es_edulcorante: bool = False,
    contiene_cafeina: bool = False,
) -> Insumo:
    ins = Insumo(
        nombre=generar_str(nombre),
        unidad_medida_id=um_id,
        categoria=categoria,
        clase_funcional=clase_funcional,
        densidad_g_ml=densidad_g_ml,
        disponible=True,
        base_calculo="100ml" if densidad_g_ml else "100g",
        valor_energetico_kcal=Decimal(str(kcal)),
        carbohidratos_g=Decimal(str(carbohidratos)),
        azucares_totales_g=Decimal(str(azucares_totales)),
        azucares_anadidos_g=Decimal(str(azucares_anadidos)),
        proteinas_g=Decimal(str(proteinas)),
        grasas_totales_g=Decimal(str(grasas_totales)),
        grasas_saturadas_g=Decimal(str(grasas_saturadas)),
        grasas_trans_g=Decimal(str(grasas_trans)),
        fibra_g=Decimal(str(fibra)),
        sodio_mg=Decimal(str(sodio)),
        aporta_azucares_agregados=aporta_azucares,
        aporta_grasas_agregadas=aporta_grasas,
        aporta_sodio_agregado=aporta_sodio,
        es_edulcorante=es_edulcorante,
        contiene_cafeina=contiene_cafeina,
    )
    session.add(ins)
    session.commit()
    session.refresh(ins)
    return ins


def _crear_receta(session, producto_id: int, rendimiento_g: float, insumos_cant: list[tuple[Insumo, float]]) -> Receta:
    from src.recetas.services import _siguiente_version_receta

    receta = Receta(
        codigo_receta=generar_str("REC"),
        nombre_receta=generar_str("Receta Sellos"),
        version=_siguiente_version_receta(session, producto_id),
        producto_id=producto_id,
        rendimiento_estandar=Decimal(str(rendimiento_g)),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=1,
    )
    session.add(receta)
    session.commit()
    session.refresh(receta)

    paso = PasoReceta(
        receta_id=receta.id,
        numero_orden=1,
        titulo="Mezcla",
        instrucciones="Mezclar",
    )
    session.add(paso)
    session.commit()
    session.refresh(paso)

    for insumo, cant in insumos_cant:
        session.add(
            PasoInsumo(
                paso_id=paso.id,
                insumo_id=insumo.id,
                cantidad_consumo_estimada=Decimal(str(cant)),
            )
        )
    session.commit()
    session.refresh(receta)
    return receta


def test_producto_solido_con_excesos_multiples_y_memoria_calculo(session, setup_sellos):
    um = setup_sellos["um_masa"].id
    azucar = _crear_insumo(
        session, um, "Azucar", kcal=400, carbohidratos=100, azucares_totales=100, azucares_anadidos=100, aporta_azucares=True
    )
    manteca = _crear_insumo(
        session, um, "Manteca", kcal=720, grasas_totales=80, grasas_saturadas=50, aporta_grasas=True
    )
    sal = _crear_insumo(
        session, um, "Sal", kcal=0, sodio=38000, aporta_sodio=True
    )
    receta = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(azucar, 40), (manteca, 58), (sal, 2)])

    res = client.get(f"/recetas/{receta.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()

    assert data["es_liquido"] is False
    assert data["base_calculo"] == "100 g"
    assert data["aplica_evaluacion_sellos"] is True
    assert data["es_calculable"] is True

    codigos = {s["codigo"] for s in data["sellos"]}
    assert codigos == {
        CodigoSelloAdvertencia.EXCESO_AZUCARES.value,
        CodigoSelloAdvertencia.EXCESO_GRASAS_TOTALES.value,
        CodigoSelloAdvertencia.EXCESO_GRASAS_SATURADAS.value,
        CodigoSelloAdvertencia.EXCESO_SODIO.value,
        CodigoSelloAdvertencia.EXCESO_CALORIAS.value,
    }

    paso_azucar = next(p for p in data["memoria_calculo"] if p["codigo"] == "azucares")
    assert paso_azucar["se_evalua"] is True
    assert paso_azucar["supera_umbral"] is True
    assert "× 4 × 100 ÷" in paso_azucar["calculo_sustituido"]


def test_producto_liquido_umbrales_etapa_2(session, setup_sellos):
    um_vol = setup_sellos["um_vol"].id
    # 100 ml: 30 kcal (> 25 kcal liquido, pero < 275 kcal solido), 7 g azucar anadido (28 kcal / 30 = 93.3%)
    jarabe = _crear_insumo(
        session,
        um_vol,
        "Jarabe",
        densidad_g_ml=1.0,
        kcal=30,
        carbohidratos=7.5,
        azucares_totales=7.0,
        azucares_anadidos=7.0,
        aporta_azucares=True,
    )
    receta = _crear_receta(session, setup_sellos["prod_liquido"].id, 100.0, [(jarabe, 100)])

    res = client.get(f"/recetas/{receta.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()

    assert data["es_liquido"] is True
    assert data["base_calculo"] == "100 ml"
    codigos = {s["codigo"] for s in data["sellos"]}
    assert CodigoSelloAdvertencia.EXCESO_CALORIAS.value in codigos
    assert CodigoSelloAdvertencia.EXCESO_AZUCARES.value in codigos


def test_calorias_altas_sin_agregados_caloricos_no_lleva_sello_calorias(session, setup_sellos):
    """Regla estricta: si solo tiene sodio agregado (sin azucares ni grasas agregadas), NO lleva sello de calorias."""
    um = setup_sellos["um_masa"].id
    harina = _crear_insumo(
        session, um, "Harina", kcal=360, carbohidratos=75, proteinas=10, grasas_totales=1.5
    )
    sal = _crear_insumo(session, um, "Sal", kcal=0, sodio=40000, aporta_sodio=True)
    # 100 g: 356 kcal (> 275 kcal) y 400 mg sodio (> 300 mg), pero SIN azucares ni grasas agregadas
    receta = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(harina, 99), (sal, 1)])

    res = client.get(f"/recetas/{receta.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()

    codigos = {s["codigo"] for s in data["sellos"]}
    assert CodigoSelloAdvertencia.EXCESO_SODIO.value in codigos
    assert CodigoSelloAdvertencia.EXCESO_CALORIAS.value not in codigos
    assert CodigoSelloAdvertencia.EXCESO_AZUCARES.value not in codigos
    assert CodigoSelloAdvertencia.EXCESO_GRASAS_TOTALES.value not in codigos

    paso_calorias = next(p for p in data["memoria_calculo"] if p["codigo"] == "calorias")
    assert paso_calorias["se_evalua"] is False
    assert "regla estricta" in paso_calorias["motivo_evaluacion"].lower()


def test_edulcorantes_y_cafeina_sin_sellos_de_exceso(session, setup_sellos):
    um = setup_sellos["um_masa"].id
    agua = _crear_insumo(session, um, "Agua", kcal=0)
    edulcorante = _crear_insumo(
        session,
        um,
        "Sucralosa",
        categoria="aditivo",
        clase_funcional="Edulcorante",
        kcal=0,
        es_edulcorante=True,
    )
    cafeina = _crear_insumo(
        session,
        um,
        "Cafeina",
        categoria="aditivo",
        clase_funcional="Aromatizante",
        kcal=0,
        contiene_cafeina=True,
    )
    receta = _crear_receta(
        session, setup_sellos["prod_solido"].id, 100.0, [(agua, 98), (edulcorante, 1), (cafeina, 1)]
    )

    res = client.get(f"/recetas/{receta.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()

    assert data["sellos"] == []
    codigos_leyendas = {l["codigo"] for l in data["leyendas_precautorias"]}
    assert codigos_leyendas == {
        CodigoLeyendaPrecautoria.CONTIENE_EDULCORANTES.value,
        CodigoLeyendaPrecautoria.CONTIENE_CAFEINA.value,
    }


def test_division_por_cero_bebida_dietetica_sin_calorias_con_sodio(session, setup_sellos):
    """Guarda de division por cero en bebidas 0 kcal: evalua sodio por umbral absoluto (>= 40 mg/100 ml)."""
    um_vol = setup_sellos["um_vol"].id
    bebida_base = _crear_insumo(
        session,
        um_vol,
        "Agua Saborizada Diet",
        densidad_g_ml=1.0,
        kcal=0,
        sodio=50,  # >= 40 mg en liquidos
        aporta_sodio=True,
        es_edulcorante=True,
    )
    receta = _crear_receta(session, setup_sellos["prod_liquido"].id, 100.0, [(bebida_base, 100)])

    res = client.get(f"/recetas/{receta.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()

    assert data["valor_energetico_100"] == 0.0
    codigos = {s["codigo"] for s in data["sellos"]}
    assert codigos == {CodigoSelloAdvertencia.EXCESO_SODIO.value}

    paso_sodio = next(p for p in data["memoria_calculo"] if p["codigo"] == "sodio")
    assert "guarda división por cero" in paso_sodio["calculo_sustituido"].lower()
    assert paso_sodio["supera_umbral"] is True


def test_doble_regla_sodio_proporcion_vs_absoluto(session, setup_sellos):
    um = setup_sellos["um_masa"].id
    # Caso A: 120 mg sodio (< 300 mg absoluto) pero 80 kcal -> 1.5 mg/kcal (>= 1.0) => EXCESO EN SODIO
    ins_ratio = _crear_insumo(session, um, "Sopa Light", kcal=80, sodio=120, aporta_sodio=True)
    receta_ratio = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(ins_ratio, 100)])

    res_a = client.get(f"/recetas/{receta_ratio.id}/sellos-advertencia").json()
    assert CodigoSelloAdvertencia.EXCESO_SODIO.value in {s["codigo"] for s in res_a["sellos"]}

    # Caso B: 350 mg sodio (>= 300 mg absoluto) y 500 kcal -> 0.7 mg/kcal (< 1.0) => EXCESO EN SODIO
    ins_abs = _crear_insumo(session, um, "Snack", kcal=500, carbohidratos=80, sodio=350, aporta_sodio=True)
    receta_abs = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(ins_abs, 100)])

    res_b = client.get(f"/recetas/{receta_abs.id}/sellos-advertencia").json()
    assert CodigoSelloAdvertencia.EXCESO_SODIO.value in {s["codigo"] for s in res_b["sellos"]}


def test_no_aplica_si_receta_no_envasada_o_exceptuada(session, setup_sellos):
    um = setup_sellos["um_masa"].id
    harina = _crear_insumo(session, um, "Harina Pura", kcal=350)
    receta_granel = _crear_receta(session, setup_sellos["prod_a_granel"].id, 100.0, [(harina, 100)])

    res = client.get(f"/recetas/{receta_granel.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()
    assert data["dictamen_aplicabilidad"] == DictamenAplicabilidad.NO_APLICA.value
    assert data["aplica_evaluacion_sellos"] is False
    assert data["sellos"] == []


def test_consistencia_energia_no_supera_100_porciento_ni_dispara_calorias_bajo_umbral(session, setup_sellos):
    """Si kcal declaradas son menores al aporte de macronutrientes, usa energia consolidada y no supera 100%."""
    um = setup_sellos["um_masa"].id
    # Insumo con valor_energetico_kcal subdeclarado (11.2 kcal) pero 4.76 g de azucares (19.04 kcal)
    insumo_desfasado = _crear_insumo(
        session,
        um,
        "Preparado",
        kcal=11.2,
        carbohidratos=4.76,
        azucares_totales=4.76,
        azucares_anadidos=4.76,
        sodio=25,
        aporta_azucares=True,
        aporta_sodio=True,
    )
    receta = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(insumo_desfasado, 100)])

    res = client.get(f"/recetas/{receta.id}/sellos-advertencia")
    assert res.status_code == 200
    data = res.json()

    # La energia consolidada debe reflejar al menos los 19.04 kcal de los 4.76 g de azucares
    assert data["valor_energetico_100"] >= 19.04
    paso_azucar = next(p for p in data["memoria_calculo"] if p["codigo"] == "azucares")
    assert 0.0 <= paso_azucar["valor_obtenido"] <= 100.0

    # Como ~19.04 kcal < 275 kcal/100g, NO debe disparar EXCESO EN CALORIAS
    codigos = {s["codigo"] for s in data["sellos"]}
    assert CodigoSelloAdvertencia.EXCESO_CALORIAS.value not in codigos

    # Sodio en 25 mg con 19.04 kcal => 1.31 mg/kcal >= 1.0 mg/kcal, con unidad mg/kcal (nunca %)
    paso_sodio = next(p for p in data["memoria_calculo"] if p["codigo"] == "sodio")
    assert paso_sodio["unidad_obtenida"] == "mg/kcal"
    assert "%" not in paso_sodio["umbral_normativo"]


def test_inhabilitacion_global_modulo_octogonos_impacta_en_aplicabilidad_y_sellos(session, setup_sellos):
    """Si ConfiguracionModulo.octogonos_activos es False, la receta pasa a NO_APLICA y no calcula sellos."""
    um = setup_sellos["um_masa"].id
    azucar = _crear_insumo(
        session,
        um,
        "Azucar",
        kcal=400,
        carbohidratos=100,
        azucares_totales=100,
        azucares_anadidos=100,
        aporta_azucares=True,
    )
    receta = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(azucar, 100)])

    # Activo por defecto -> APLICA y calcula sellos
    assert client.get(f"/recetas/{receta.id}/aplicabilidad-frontal").json()["dictamen"] == DictamenAplicabilidad.APLICA.value
    assert client.get(f"/recetas/{receta.id}/sellos-advertencia").json()["aplica_evaluacion_sellos"] is True

    # Desactivar módulo global desde /configuracion/modulo-octogonos
    res_off = client.patch(
        "/configuracion/modulo-octogonos",
        json={"octogonos_activos": False, "observacion": "Solo productos B2B"},
    )
    assert res_off.status_code == 200

    try:
        aplica_off = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal").json()
        assert aplica_off["dictamen"] == DictamenAplicabilidad.NO_APLICA.value
        assert aplica_off["modulo_octogonos_activo"] is False
        assert "desactivada en configuración del sistema" in aplica_off["motivo"].lower()

        sellos_off = client.get(f"/recetas/{receta.id}/sellos-advertencia").json()
        assert sellos_off["aplica_evaluacion_sellos"] is False
        assert sellos_off["sellos"] == []
    finally:
        # Reactivar para no afectar otros tests
        client.patch("/configuracion/modulo-octogonos", json={"octogonos_activos": True})


def test_nueva_version_parametros_frontales_impacta_en_calculo_y_respeta_lotes(session, setup_sellos):
    """Al publicar una nueva versión de umbrales en /configuracion/parametros-frontales, las recetas sin lotes migran y las con lotes conservan la versión anterior."""
    um = setup_sellos["um_masa"].id
    # 100 g: 100 kcal totales y 2 g de azucar anadido => 8 kcal / 100 kcal = 8% (menor al 10% inicial)
    base = _crear_insumo(
        session,
        um,
        "Base Moderada",
        kcal=100,
        carbohidratos=25,
        azucares_totales=2,
        azucares_anadidos=2,
        aporta_azucares=True,
    )

    param_inicial = client.get("/configuracion/parametros-frontales").json()
    v1_id = param_inicial["version_vigente"]["id"]
    reglas_v1 = param_inicial["version_vigente"]["reglas"]

    receta_sin_lotes = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(base, 100)])
    receta_sin_lotes.version_parametro_frontal_id = v1_id

    receta_con_lotes = _crear_receta(session, setup_sellos["prod_solido"].id, 100.0, [(base, 100)])
    receta_con_lotes.version_parametro_frontal_id = v1_id
    session.add(
        Lote(
            codigo_lote=generar_str("LOT"),
            producto_id=setup_sellos["prod_solido"].id,
            receta_id=receta_con_lotes.id,
            operador_id=1,
            fecha_elaboracion=datetime.now(),
            fecha_vencimiento=date.today(),
            cantidad_producida=Decimal("10.00"),
        )
    )
    session.commit()

    # Con v1 (umbral azucares 10%): ninguna lleva EXCESO EN AZUCARES (8% < 10%)
    assert CodigoSelloAdvertencia.EXCESO_AZUCARES.value not in {
        s["codigo"] for s in client.get(f"/recetas/{receta_sin_lotes.id}/sellos-advertencia").json()["sellos"]
    }

    # Publicar v2 bajando el umbral de AZUCARES_ANADIDOS en ALIMENTO a 5%
    nuevas_reglas = [
        {
            "nutriente_critico": r["nutriente_critico"],
            "leyenda_sello": r["leyenda_sello"],
            "categoria": r["categoria"],
            "valor_umbral": 5.0
            if r["nutriente_critico"] == "AZUCARES_ANADIDOS" and r["categoria"] == "ALIMENTO"
            else r["valor_umbral"],
            "unidad_umbral": r["unidad_umbral"],
            "condicion": r["condicion"],
        }
        for r in reglas_v1
    ]
    res_v2 = client.post(
        "/configuracion/parametros-frontales",
        json={
            "normativa_referencia": "Disposicion ANMAT E3",
            "motivo_cambio": "Reduccion de umbral de azucares a 5%",
            "reglas": nuevas_reglas,
        },
    )
    assert res_v2.status_code == 200
    v2_id = res_v2.json()["version_vigente"]["id"]
    assert v2_id != v1_id

    session.expire_all()
    assert session.get(Receta, receta_sin_lotes.id).version_parametro_frontal_id == v2_id
    assert session.get(Receta, receta_con_lotes.id).version_parametro_frontal_id == v1_id

    # Sin lotes -> ahora supera el 5% (8% >= 5%) y lleva EXCESO EN AZUCARES
    sellos_sin_lotes = client.get(f"/recetas/{receta_sin_lotes.id}/sellos-advertencia").json()
    assert CodigoSelloAdvertencia.EXCESO_AZUCARES.value in {s["codigo"] for s in sellos_sin_lotes["sellos"]}
    assert "Versión #2" in sellos_sin_lotes["version_normativa"]

    # Con lotes -> conserva v1 (10%) y sigue sin llevar EXCESO EN AZUCARES
    sellos_con_lotes = client.get(f"/recetas/{receta_con_lotes.id}/sellos-advertencia").json()
    assert CodigoSelloAdvertencia.EXCESO_AZUCARES.value not in {s["codigo"] for s in sellos_con_lotes["sellos"]}
    assert "Versión #1" in sellos_con_lotes["version_normativa"]
