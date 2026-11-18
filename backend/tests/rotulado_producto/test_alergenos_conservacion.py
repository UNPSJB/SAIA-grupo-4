from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from src.configuracion.models import ConfiguracionSistema
from src.configuracion_nutricional.services import inicializar_configuracion_nutricional
from src.insumos.models import Insumo
from src.lotes.models import Lote
from src.main import app
from src.personal.models import Persona
from src.productos.models import Producto
from src.recetas.constants import EstadoReceta
from src.recetas.models import PasoInsumo, PasoReceta, Receta
from src.rotulado_producto.constants import CodigoAlergenoCAA, EstadoValidacionAlergenos
from src.rotulado_producto.schemas import AlergenoRotuloItem
from src.rotulado_producto.services import generar_leyenda_alergenos_caa
from src.unidad_medida.models import UnidadMedida
from tests.database import session

client = TestClient(app)


def generar_str(prefijo: str) -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def setup_alergenos(session):
    inicializar_configuracion_nutricional(session)

    um_masa = UnidadMedida(
        nombre=generar_str("Gramo"),
        simbolo="g",
        tipo_magnitud="masa",
        disponible=True,
    )
    session.add(um_masa)
    session.commit()
    session.refresh(um_masa)

    config = session.query(ConfiguracionSistema).first()
    if not config:
        config = ConfiguracionSistema(
            nombre_establecimiento="Establecimiento Alergenos",
            razon_social="Alimentos SAIA S.A.",
            direccion="Av. Colon 100",
            localidad="Cordoba",
            provincia="Cordoba",
        )
        session.add(config)
        session.commit()

    usuario = session.query(Persona).first()
    if not usuario:
        usuario = Persona(
            nombre="Admin",
            apellido="Test",
            usuario=generar_str("admin"),
            clave="hash",
            activo=True,
        )
        session.add(usuario)
        session.commit()
        session.refresh(usuario)

    harina = Insumo(
        nombre=generar_str("Harina de Trigo"),
        denominacion_rotulo="Harina de trigo 000",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        alergenos_declarados_json=[{"codigo": "TRIGO", "es_derivado": True}],
        valor_energetico_kcal=Decimal("350"),
        carbohidratos_g=Decimal("75"),
        azucares_totales_g=Decimal("1"),
        azucares_anadidos_g=Decimal("0"),
        proteinas_g=Decimal("10"),
        grasas_totales_g=Decimal("1"),
        grasas_saturadas_g=Decimal("0.2"),
        grasas_trans_g=Decimal("0"),
        fibra_g=Decimal("3"),
        sodio_mg=Decimal("5"),
    )
    huevo = Insumo(
        nombre=generar_str("Huevo Liquido"),
        denominacion_rotulo="Huevo",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        alergenos_declarados_json=[{"codigo": "HUEVO", "es_derivado": False}],
        valor_energetico_kcal=Decimal("143"),
        carbohidratos_g=Decimal("1"),
        azucares_totales_g=Decimal("1"),
        azucares_anadidos_g=Decimal("0"),
        proteinas_g=Decimal("12"),
        grasas_totales_g=Decimal("10"),
        grasas_saturadas_g=Decimal("3"),
        grasas_trans_g=Decimal("0"),
        fibra_g=Decimal("0"),
        sodio_mg=Decimal("140"),
    )
    lecitina = Insumo(
        nombre=generar_str("Lecitina de Soja"),
        denominacion_rotulo="Lecitina de soja",
        categoria="aditivo",
        clase_funcional="Emulsionante",
        numero_ins="322",
        unidad_medida_id=um_masa.id,
        disponible=True,
        alergenos_declarados_json=[{"codigo": "SOJA", "es_derivado": True}],
        valor_energetico_kcal=Decimal("800"),
        sodio_mg=Decimal("0"),
    )
    manteca = Insumo(
        nombre=generar_str("Manteca"),
        denominacion_rotulo="Manteca",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        alergenos_declarados_json=[{"codigo": "LECHE", "es_derivado": True}],
        valor_energetico_kcal=Decimal("717"),
        carbohidratos_g=Decimal("0"),
        azucares_totales_g=Decimal("0"),
        azucares_anadidos_g=Decimal("0"),
        proteinas_g=Decimal("1"),
        grasas_totales_g=Decimal("81"),
        grasas_saturadas_g=Decimal("51"),
        grasas_trans_g=Decimal("0"),
        fibra_g=Decimal("0"),
        sodio_mg=Decimal("11"),
    )
    session.add_all([harina, huevo, lecitina, manteca])
    session.commit()
    for x in (harina, huevo, lecitina, manteca):
        session.refresh(x)

    producto = Producto(
        nombre=generar_str("Budin Casero"),
        descripcion="Budin con huevo, trigo y soja",
        unidad_medida_id=um_masa.id,
        dias_vida_util=30,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    session.add(producto)
    session.commit()
    session.refresh(producto)

    receta = Receta(
        codigo_receta=generar_str("REC-BUD"),
        nombre_receta="Receta Budin",
        producto_id=producto.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    session.add(receta)
    session.flush()
    paso = PasoReceta(
        receta_id=receta.id,
        numero_orden=1,
        titulo="Mezcla",
        instrucciones="Mezclar todo",
    )
    session.add(paso)
    session.flush()
    session.add_all([
        PasoInsumo(paso_id=paso.id, insumo_id=harina.id, cantidad_consumo_estimada=250),
        PasoInsumo(paso_id=paso.id, insumo_id=huevo.id, cantidad_consumo_estimada=200),
        PasoInsumo(paso_id=paso.id, insumo_id=lecitina.id, cantidad_consumo_estimada=50),
    ])
    session.commit()

    return {
        "producto": producto,
        "receta": receta,
        "manteca": manteca,
        "paso": paso,
        "usuario": usuario,
    }


def test_propuesta_automatica_alergenos_sintaxis_caa_sin_contiene_gluten(setup_alergenos):
    prod = setup_alergenos["producto"]
    res = client.get(f"/productos/{prod.id}/rotulo")
    assert res.status_code == 200
    data = res.json()

    leyenda = data["leyenda_alergenos_declarada"]
    assert leyenda == "CONTIENE HUEVO Y DERIVADOS DE TRIGO Y SOJA."
    assert "GLUTEN" not in leyenda
    assert data["estado_validacion_alergenos"] == EstadoValidacionAlergenos.SUGERIDO.value


def test_contaminacion_cruzada_excluye_alergenos_ya_presentes():
    presentes = [
        AlergenoRotuloItem(codigo=CodigoAlergenoCAA.HUEVO, es_derivado=False),
        AlergenoRotuloItem(codigo=CodigoAlergenoCAA.TRIGO, es_derivado=True),
    ]
    cruzada = [
        AlergenoRotuloItem(codigo=CodigoAlergenoCAA.HUEVO, es_derivado=False),  # solapado, debe excluirse
        AlergenoRotuloItem(codigo=CodigoAlergenoCAA.MANI, es_derivado=False),
        AlergenoRotuloItem(codigo=CodigoAlergenoCAA.AVENA, es_derivado=True),
    ]
    leyenda = generar_leyenda_alergenos_caa(presentes, cruzada)
    assert leyenda == "CONTIENE HUEVO Y DERIVADOS DE TRIGO. PUEDE CONTENER MANÍ Y DERIVADOS DE AVENA."


def test_flujo_estado_sugerido_a_confirmado_e_invalidacion_por_cambio_de_receta(session, setup_alergenos):
    prod = setup_alergenos["producto"]
    paso = setup_alergenos["paso"]
    manteca = setup_alergenos["manteca"]

    inicial = client.get(f"/productos/{prod.id}/rotulo").json()
    assert inicial["estado_validacion_alergenos"] == "SUGERIDO"

    # Confirmar declaración de alérgenos y conservación
    res_conf = client.put(
        f"/productos/{prod.id}/rotulo",
        json={
            "denominacion_venta": inicial["denominacion_venta"],
            "alergenos_presentes_json": inicial["alergenos_presentes_json"],
            "alergenos_contaminacion_cruzada_json": [{"codigo": "MANI", "es_derivado": False}],
            "temp_conservacion_min_c": 15.0,
            "temp_conservacion_max_c": 25.0,
            "durabilidad_antes_abrir": "30 dias cerrado",
            "durabilidad_despues_abrir": "5 dias abierto",
            "condiciones_conservacion": "Conservar en lugar fresco y seco",
            "confirmar_alergenos_conservacion": True,
        },
    )
    assert res_conf.status_code == 200
    confirmado = res_conf.json()
    assert confirmado["estado_validacion_alergenos"] == "CONFIRMADO"
    assert confirmado["confirmado_alergenos_por_nombre"] is not None
    assert "PUEDE CONTENER MANÍ." in confirmado["leyenda_alergenos_declarada"]

    # Agregar un nuevo insumo con alérgeno LECHE a la receta activa -> debe invalidar la confirmación
    session.add(PasoInsumo(paso_id=paso.id, insumo_id=manteca.id, cantidad_consumo_estimada=50))
    session.commit()

    res_despues = client.get(f"/productos/{prod.id}/rotulo")
    assert res_despues.status_code == 200
    invalidado = res_despues.json()
    assert invalidado["estado_validacion_alergenos"] == "SUGERIDO"
    assert invalidado["confirmacion_invalidada_por_cambio_receta"] is True
    assert "LECHE" in invalidado["leyenda_alergenos_declarada"]


def test_conservacion_estructurada_y_guardado_parcial_sin_bloqueo_422(setup_alergenos):
    prod = setup_alergenos["producto"]
    res_put = client.put(
        f"/productos/{prod.id}/rotulo",
        json={
            "temp_conservacion_min_c": 2.0,
            "temp_conservacion_max_c": 8.0,
            "durabilidad_antes_abrir": "15 dias refrigerado",
            "durabilidad_despues_abrir": "48 horas una vez abierto",
            "aplica_instrucciones_uso": True,
            "instrucciones_uso": "Hornear 10 minutos a 180 C antes de consumir.",
        },
    )
    assert res_put.status_code == 200
    data = res_put.json()
    assert data["temp_conservacion_min_c"] == 2.0
    assert data["temp_conservacion_max_c"] == 8.0
    assert data["aplica_instrucciones_uso"] is True
    assert data["completitud_caa"]["esta_completo"] is False
