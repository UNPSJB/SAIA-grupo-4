import uuid
import pytest
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.insumos.models import Insumo
from src.productos.models import Producto
from src.recetas.models import Receta, PasoReceta, PasoInsumo
from src.recetas.constants import EstadoReceta
from src.rotulado.constants import DictamenAplicabilidad
from src.rotulado.models import NormativaRotulado
from src.unidad_medida.models import UnidadMedida

client = TestClient(app)


def generar_str(prefijo: str) -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def setup_datos(session):
    um = UnidadMedida(
        nombre=generar_str("Gramo"),
        simbolo="g",
        tipo_magnitud="masa",
        disponible=True,
    )
    session.add(um)
    session.commit()
    session.refresh(um)

    # Insumo base sin agregados
    insumo_harina = Insumo(
        nombre=generar_str("Harina de Trigo"),
        categoria="materia prima",
        unidad_medida_id=um.id,
        disponible=True,
        aporta_azucares_agregados=False,
        aporta_grasas_agregadas=False,
        aporta_sodio_agregado=False,
        es_edulcorante=False,
        contiene_cafeina=False,
    )

    # Insumo con azúcares añadidos
    insumo_azucar = Insumo(
        nombre=generar_str("Azúcar refinada"),
        categoria="materia prima",
        unidad_medida_id=um.id,
        disponible=True,
        aporta_azucares_agregados=True,
        aporta_grasas_agregadas=False,
        aporta_sodio_agregado=False,
        es_edulcorante=False,
        contiene_cafeina=False,
    )

    # Aditivo edulcorante por clase funcional
    insumo_edulcorante = Insumo(
        nombre=generar_str("Sucralosa"),
        categoria="aditivo",
        clase_funcional="Edulcorante",
        numero_ins="955",
        unidad_medida_id=um.id,
        disponible=True,
        es_edulcorante=True,
    )

    # Insumo con cafeína
    insumo_cafeina = Insumo(
        nombre=generar_str("Extracto de café"),
        categoria="materia prima",
        unidad_medida_id=um.id,
        disponible=True,
        contiene_cafeina=True,
    )

    # Insumo con grasas agregadas
    insumo_manteca = Insumo(
        nombre=generar_str("Manteca"),
        categoria="materia prima",
        unidad_medida_id=um.id,
        disponible=True,
        aporta_grasas_agregadas=True,
    )

    # Insumo con sodio agregado
    insumo_sal = Insumo(
        nombre=generar_str("Sal fina"),
        categoria="materia prima",
        unidad_medida_id=um.id,
        disponible=True,
        aporta_sodio_agregado=True,
    )

    session.add_all([
        insumo_harina,
        insumo_azucar,
        insumo_edulcorante,
        insumo_cafeina,
        insumo_manteca,
        insumo_sal,
    ])
    session.commit()

    prod_envasado = Producto(
        nombre=generar_str("Galletitas"),
        descripcion="Galletitas envasadas",
        unidad_medida_id=um.id,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_a_granel = Producto(
        nombre=generar_str("Pan a granel"),
        descripcion="Venta mostrador",
        unidad_medida_id=um.id,
        envasado_ausencia_cliente=False,
        activo=True,
    )
    session.add_all([prod_envasado, prod_a_granel])
    session.commit()

    return {
        "um": um,
        "harina": insumo_harina,
        "azucar": insumo_azucar,
        "edulcorante": insumo_edulcorante,
        "cafeina": insumo_cafeina,
        "manteca": insumo_manteca,
        "sal": insumo_sal,
        "prod_envasado": prod_envasado,
        "prod_a_granel": prod_a_granel,
    }


def crear_receta_con_insumos(session, producto, insumos_cantidades, usuario_id=1) -> Receta:
    r = Receta(
        codigo_receta=generar_str("REC"),
        nombre_receta=f"Receta de {producto.nombre}",
        producto_id=producto.id,
        rendimiento_estandar=1000.0,
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario_id,
    )
    session.add(r)
    session.commit()
    session.refresh(r)

    paso = PasoReceta(
        receta_id=r.id,
        numero_orden=1,
        titulo="Paso único",
        instrucciones="Mezclar ingredientes",
    )
    session.add(paso)
    session.commit()
    session.refresh(paso)

    for insumo, cant in insumos_cantidades:
        pi = PasoInsumo(
            paso_id=paso.id,
            insumo_id=insumo.id,
            cantidad_consumo_estimada=cant,
        )
        session.add(pi)

    session.commit()
    session.refresh(r)
    return r


# --- TESTS DE APLICABILIDAD DE ROTULADO FRONTAL ---


def test_no_aplica_si_producto_no_envasado_en_ausencia_cliente(session, setup_datos):
    """Criterio 1: Si el producto NO se envasa en ausencia del cliente, informa que no corresponde el rotulado frontal."""
    prod = setup_datos["prod_a_granel"]
    receta = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 500), (setup_datos["azucar"], 100)]
    )

    res = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res.status_code == 200
    data = res.json()

    assert data["envasado_ausencia_cliente"] is False
    assert data["aplica_rotulado_frontal"] is False
    assert data["dictamen"] == DictamenAplicabilidad.NO_APLICA.value
    assert "no se comercializa envasado en ausencia del cliente" in data["motivo"].lower()


def test_exceptuado_si_envasado_pero_sin_agregados_ni_edulcorantes_o_cafeina(session, setup_datos):
    """Criterio 3: Si está envasado pero no tiene agregados ni edulcorantes/cafeína, queda exceptuado."""
    prod = setup_datos["prod_envasado"]
    receta = crear_receta_con_insumos(session, prod, [(setup_datos["harina"], 500)])

    res = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res.status_code == 200
    data = res.json()

    assert data["envasado_ausencia_cliente"] is True
    assert data["calculado_azucares_agregados"] is False
    assert data["calculado_grasas_agregadas"] is False
    assert data["calculado_sodio_agregado"] is False
    assert data["calculado_edulcorantes"] is False
    assert data["calculado_cafeina"] is False

    assert data["aplica_rotulado_frontal"] is False
    assert data["dictamen"] == DictamenAplicabilidad.EXCEPTUADO.value
    assert "exceptuado" in data["dictamen_titulo"].lower()


def test_aplica_si_envasado_con_azucares_agregados(session, setup_datos):
    """Criterio 2: Detecta azúcares agregados y determina que aplica evaluación de sellos."""
    prod = setup_datos["prod_envasado"]
    receta = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 400), (setup_datos["azucar"], 100)]
    )

    res = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res.status_code == 200
    data = res.json()

    assert data["calculado_azucares_agregados"] is True
    assert data["tiene_azucares_agregados"] is True
    assert data["aplica_rotulado_frontal"] is True
    assert data["dictamen"] == DictamenAplicabilidad.APLICA.value


def test_aplica_si_contiene_aditivo_edulcorante(session, setup_datos):
    """Criterio 2: Un aditivo de clase edulcorante marca el producto como con edulcorantes y aplica."""
    prod = setup_datos["prod_envasado"]
    receta = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 500), (setup_datos["edulcorante"], 5)]
    )

    res = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res.status_code == 200
    data = res.json()

    assert data["calculado_edulcorantes"] is True
    assert data["contiene_edulcorantes"] is True
    assert data["aplica_rotulado_frontal"] is True
    assert data["dictamen"] == DictamenAplicabilidad.APLICA.value


def test_aplica_si_contiene_cafeina_o_grasas_o_sodio(session, setup_datos):
    """Criterio 2: Detecta cafeína, grasas agregadas y sodio agregado."""
    prod = setup_datos["prod_envasado"]
    receta = crear_receta_con_insumos(
        session,
        prod,
        [
            (setup_datos["harina"], 500),
            (setup_datos["cafeina"], 10),
            (setup_datos["manteca"], 50),
            (setup_datos["sal"], 5),
        ],
    )

    res = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res.status_code == 200
    data = res.json()

    assert data["calculado_cafeina"] is True
    assert data["calculado_grasas_agregadas"] is True
    assert data["calculado_sodio_agregado"] is True
    assert data["aplica_rotulado_frontal"] is True


def test_overrides_manuales_y_reversion_a_calculo_automatico(session, setup_datos):
    """Criterio 2: Permite corregir manualmente las marcas de agregados/sustancias y revertirlas."""
    prod = setup_datos["prod_envasado"]
    # Receta que inicialmente solo tiene harina (sin agregados, dictamen EXCEPTUADO)
    receta = crear_receta_con_insumos(session, prod, [(setup_datos["harina"], 500)])

    res_inicial = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal").json()
    assert res_inicial["dictamen"] == DictamenAplicabilidad.EXCEPTUADO.value
    assert res_inicial["es_aplicabilidad_forzada_manualmente"] is False

    # 1. Corrección manual: se marca override de azúcares agregados en True
    payload = {"override_azucares_agregados": True}
    res_put = client.put(f"/recetas/{receta.id}/aplicabilidad-frontal", json=payload)
    assert res_put.status_code == 200
    data_put = res_put.json()

    assert data_put["calculado_azucares_agregados"] is False
    assert data_put["override_azucares_agregados"] is True
    assert data_put["tiene_azucares_agregados"] is True
    assert data_put["es_aplicabilidad_forzada_manualmente"] is True
    # Ahora aplica evaluación de sellos debido al override manual
    assert data_put["dictamen"] == DictamenAplicabilidad.APLICA.value

    # 2. Corrección manual inversa: una receta con azúcar se desmarca manualmente
    receta_dulce = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 400), (setup_datos["azucar"], 100)]
    )
    res_override_falso = client.put(
        f"/recetas/{receta_dulce.id}/aplicabilidad-frontal",
        json={"override_azucares_agregados": False},
    ).json()
    assert res_override_falso["calculado_azucares_agregados"] is True
    assert res_override_falso["override_azucares_agregados"] is False
    assert res_override_falso["tiene_azucares_agregados"] is False
    assert res_override_falso["dictamen"] == DictamenAplicabilidad.EXCEPTUADO.value

    # 3. Restablecer automático: vuelve al cálculo detectado
    res_reset = client.put(
        f"/recetas/{receta_dulce.id}/aplicabilidad-frontal",
        json={"restablecer_automatico": True},
    ).json()
    assert res_reset["override_azucares_agregados"] is None
    assert res_reset["es_aplicabilidad_forzada_manualmente"] is False
    assert res_reset["tiene_azucares_agregados"] is True
    assert res_reset["dictamen"] == DictamenAplicabilidad.APLICA.value


def test_reglas_versionadas_y_configurables(session, setup_datos):
    """Criterio 4: Las reglas de aplicabilidad se evalúan según la versión activa de parámetros normativos."""
    prod = setup_datos["prod_envasado"]
    # Receta que solo tiene cafeína
    receta = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 500), (setup_datos["cafeina"], 20)]
    )

    # Con la normativa activa por defecto (evalua_cafeina=True) -> APLICA
    res1 = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal").json()
    assert res1["dictamen"] == DictamenAplicabilidad.APLICA.value

    # Se desactiva la evaluación de cafeína en la normativa versionada activa
    normativa = session.query(NormativaRotulado).filter(NormativaRotulado.activa == True).first()
    normativa.evalua_cafeina = False
    session.commit()

    # Ahora debe quedar EXCEPTUADO porque la normativa activa ya no evalúa cafeína
    res2 = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal").json()
    assert res2["dictamen"] == DictamenAplicabilidad.EXCEPTUADO.value


def test_receta_inexistente_retorna_404():
    res = client.get("/recetas/99999/aplicabilidad-frontal")
    assert res.status_code == 404
