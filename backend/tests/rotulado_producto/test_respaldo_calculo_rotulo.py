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
from src.rotulado_producto.constants import LEYENDA_BORRADOR_ROTULO
from src.unidad_medida.models import UnidadMedida
from tests.database import session

client = TestClient(app)


def generar_str(prefijo: str) -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def setup_respaldo_calculo(session):
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
            nombre_establecimiento="Establecimiento Respaldo",
            razon_social="Alimentos SAIA S.A.",
            direccion="Av. Siempre Viva 742",
            localidad="Córdoba",
            provincia="Córdoba",
        )
        session.add(config)
    session.commit()

    usuario = session.query(Persona).first()
    if not usuario:
        usuario = Persona(
            nombre="Admin",
            apellido="Respaldo",
            usuario=generar_str("admin"),
            clave="hash",
            activo=True,
        )
        session.add(usuario)
        session.commit()
        session.refresh(usuario)

    harina = Insumo(
        nombre=generar_str("Harina"),
        denominacion_rotulo="Harina de trigo 000",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        alergenos_declarados_json=[{"codigo": "TRIGO", "es_derivado": False}],
        fuente_nutricional="SARA 2",
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
    azucar = Insumo(
        nombre=generar_str("Azucar"),
        denominacion_rotulo="Azúcar",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        aporta_azucares_agregados=True,
        fuente_nutricional="Ficha técnica de proveedor",
        valor_energetico_kcal=Decimal("400"),
        carbohidratos_g=Decimal("100"),
        azucares_totales_g=Decimal("100"),
        azucares_anadidos_g=Decimal("100"),
        proteinas_g=Decimal("0"),
        grasas_totales_g=Decimal("0"),
        grasas_saturadas_g=Decimal("0"),
        grasas_trans_g=Decimal("0"),
        fibra_g=Decimal("0"),
        sodio_mg=Decimal("0"),
    )
    aditivo = Insumo(
        nombre=generar_str("Bicarbonato"),
        denominacion_rotulo="Bicarbonato de sodio",
        categoria="aditivo",
        clase_funcional="Leudante químico",
        numero_ins="500ii",
        unidad_medida_id=um_masa.id,
        disponible=True,
        fuente_nutricional="Valor propio",
        valor_energetico_kcal=Decimal("0"),
        carbohidratos_g=Decimal("0"),
        azucares_totales_g=Decimal("0"),
        azucares_anadidos_g=Decimal("0"),
        proteinas_g=Decimal("0"),
        grasas_totales_g=Decimal("0"),
        grasas_saturadas_g=Decimal("0"),
        grasas_trans_g=Decimal("0"),
        fibra_g=Decimal("0"),
        sodio_mg=Decimal("27360"),
    )
    insumo_pendiente = Insumo(
        nombre=generar_str("Semillas"),
        denominacion_rotulo="Semillas de chía",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
    )
    session.add_all([harina, azucar, aditivo, insumo_pendiente])
    session.commit()
    for ins in (harina, azucar, aditivo, insumo_pendiente):
        session.refresh(ins)

    prod_completo = Producto(
        nombre=generar_str("Galletas Respaldo"),
        descripcion="Producto completo",
        unidad_medida_id=um_masa.id,
        dias_vida_util=180,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_pendiente = Producto(
        nombre=generar_str("Pan Semillas"),
        descripcion="Con insumo sin nutrición",
        unidad_medida_id=um_masa.id,
        dias_vida_util=7,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_sin_receta = Producto(
        nombre=generar_str("Sin Receta Activa"),
        descripcion="Sin receta",
        unidad_medida_id=um_masa.id,
        dias_vida_util=30,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    session.add_all([prod_completo, prod_pendiente, prod_sin_receta])
    session.commit()
    for p in (prod_completo, prod_pendiente, prod_sin_receta):
        session.refresh(p)

    receta_comp = Receta(
        codigo_receta=generar_str("REC-RESP"),
        nombre_receta="Receta Galletas Respaldo",
        producto_id=prod_completo.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    receta_pend = Receta(
        codigo_receta=generar_str("REC-PEND"),
        nombre_receta="Receta Pan Semillas",
        producto_id=prod_pendiente.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    session.add_all([receta_comp, receta_pend])
    session.flush()

    paso_c = PasoReceta(
        receta_id=receta_comp.id,
        numero_orden=1,
        titulo="Mezcla",
        instrucciones="Mezclar",
    )
    paso_p = PasoReceta(
        receta_id=receta_pend.id,
        numero_orden=1,
        titulo="Amasado",
        instrucciones="Amasar",
    )
    session.add_all([paso_c, paso_p])
    session.flush()

    session.add_all([
        PasoInsumo(paso_id=paso_c.id, insumo_id=harina.id, cantidad_consumo_estimada=295),
        PasoInsumo(paso_id=paso_c.id, insumo_id=azucar.id, cantidad_consumo_estimada=200),
        PasoInsumo(paso_id=paso_c.id, insumo_id=aditivo.id, cantidad_consumo_estimada=5),
        PasoInsumo(paso_id=paso_p.id, insumo_id=harina.id, cantidad_consumo_estimada=450),
        PasoInsumo(paso_id=paso_p.id, insumo_id=insumo_pendiente.id, cantidad_consumo_estimada=50),
    ])
    session.flush()

    lote = Lote(
        codigo_lote=generar_str("LOT-RESP"),
        producto_id=prod_completo.id,
        receta_id=receta_comp.id,
        operador_id=usuario.id,
        fecha_elaboracion=datetime.now(),
        fecha_vencimiento=date.today() + timedelta(days=180),
        cantidad_producida=Decimal("10"),
    )
    session.add(lote)
    session.commit()

    return {
        "prod_completo": prod_completo,
        "prod_pendiente": prod_pendiente,
        "prod_sin_receta": prod_sin_receta,
        "receta_comp": receta_comp,
    }


def test_respaldo_calculo_completo_incluye_cuatro_anexos(setup_respaldo_calculo):
    prod = setup_respaldo_calculo["prod_completo"]
    receta = setup_respaldo_calculo["receta_comp"]

    res = client.get(f"/productos/{prod.id}/rotulo/respaldo-calculo")
    assert res.status_code == 200
    data = res.json()

    assert data["leyenda_borrador_obligatoria"] == LEYENDA_BORRADOR_ROTULO
    assert data["tiene_receta_activa"] is True
    assert data["codigo_receta_empleada"] == receta.codigo_receta
    assert data["version_parametros_aplicada"] is not None
    assert data["fecha_emision"] is not None

    # Anexo I: Receta activa (ingredientes + aditivo con clase funcional e INS)
    anexo_rec = data["anexo_receta"]
    assert anexo_rec is not None
    assert len(anexo_rec["ingredientes"]) == 2
    assert len(anexo_rec["aditivos"]) == 1
    assert anexo_rec["aditivos"][0]["clase_funcional"] == "Leudante químico"
    assert anexo_rec["aditivos"][0]["numero_ins"] == "500ii"

    # Anexo II: Composición porcentual
    anexo_comp = data["anexo_composicion"]
    assert anexo_comp is not None
    assert anexo_comp["verificacion_100"] is True
    assert anexo_comp["peso_total_mezcla_g"] == 500.0

    # Anexo III: Nutrición detallada + fuentes de datos
    anexo_nut = data["anexo_nutricion"]
    assert anexo_nut is not None
    assert anexo_nut["informacion_nutricional"]["es_calculable"] is True
    fuentes = {f["fuente_nutricional"] for f in anexo_nut["fuentes_datos_insumos"]}
    assert "SARA 2" in fuentes
    assert "Ficha técnica de proveedor" in fuentes

    # Anexo IV: Memoria de cálculo de sellos
    anexo_sellos = data["anexo_memoria_sellos"]
    assert anexo_sellos is not None
    assert anexo_sellos["sellos"]["es_calculable"] is True
    assert len(anexo_sellos["sellos"]["memoria_calculo"]) > 0
    assert any(
        s["codigo"] == "EXCESO_AZUCARES"
        for s in anexo_sellos["sellos"]["sellos"]
    )


def test_respaldo_calculo_con_nutricion_pendiente_reporta_faltantes(setup_respaldo_calculo):
    prod = setup_respaldo_calculo["prod_pendiente"]

    res = client.get(f"/productos/{prod.id}/rotulo/respaldo-calculo")
    assert res.status_code == 200
    data = res.json()

    assert data["leyenda_borrador_obligatoria"] == LEYENDA_BORRADOR_ROTULO
    anexo_nut = data["anexo_nutricion"]
    assert anexo_nut is not None
    assert anexo_nut["informacion_nutricional"]["es_calculable"] is False
    pendientes = [
        f for f in anexo_nut["fuentes_datos_insumos"] if not f["nutricion_completa"]
    ]
    assert len(pendientes) == 1
    assert len(pendientes[0]["campos_faltantes"]) > 0


def test_respaldo_calculo_sin_receta_activa_devuelve_anexos_nulos(setup_respaldo_calculo):
    prod = setup_respaldo_calculo["prod_sin_receta"]

    res = client.get(f"/productos/{prod.id}/rotulo/respaldo-calculo")
    assert res.status_code == 200
    data = res.json()

    assert data["leyenda_borrador_obligatoria"] == LEYENDA_BORRADOR_ROTULO
    assert data["tiene_receta_activa"] is False
    assert data["anexo_receta"] is None
    assert data["anexo_composicion"] is None
    assert data["anexo_nutricion"] is None
    assert data["anexo_memoria_sellos"] is None
