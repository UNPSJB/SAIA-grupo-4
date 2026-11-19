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
def setup_vista_previa(session):
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
            nombre_establecimiento="Establecimiento Preview",
            razon_social="Alimentos SAIA S.A.",
            direccion="Av. Siempre Viva 742",
            localidad="Córdoba",
            provincia="Córdoba",
        )
        session.add(config)
    else:
        config.razon_social = "Alimentos SAIA S.A."
        config.direccion = "Av. Siempre Viva 742"
        config.localidad = "Córdoba"
        config.provincia = "Córdoba"
    session.commit()

    usuario = session.query(Persona).first()
    if not usuario:
        usuario = Persona(
            nombre="Admin",
            apellido="Preview",
            usuario=generar_str("admin"),
            clave="hash",
            activo=True,
        )
        session.add(usuario)
        session.commit()
        session.refresh(usuario)

    azucar = Insumo(
        nombre=generar_str("Azucar"),
        denominacion_rotulo="Azúcar",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        aporta_azucares_agregados=True,
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
    harina = Insumo(
        nombre=generar_str("Harina"),
        denominacion_rotulo="Harina de trigo 000",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
        alergenos_declarados_json=[{"codigo": "TRIGO", "es_derivado": False}],
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
    session.add_all([azucar, harina])
    session.commit()
    session.refresh(azucar)
    session.refresh(harina)

    prod_completo = Producto(
        nombre=generar_str("Galletas Dulces"),
        descripcion="Galletas con azúcar y harina",
        unidad_medida_id=um_masa.id,
        dias_vida_util=180,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_no_aplica = Producto(
        nombre=generar_str("Pan Mostrador"),
        descripcion="Venta en mostrador",
        unidad_medida_id=um_masa.id,
        dias_vida_util=3,
        envasado_ausencia_cliente=False,
        activo=True,
    )
    prod_sin_receta = Producto(
        nombre=generar_str("Producto Incompleto"),
        descripcion="Sin receta activa",
        unidad_medida_id=um_masa.id,
        dias_vida_util=60,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    session.add_all([prod_completo, prod_no_aplica, prod_sin_receta])
    session.commit()
    session.refresh(prod_completo)
    session.refresh(prod_no_aplica)
    session.refresh(prod_sin_receta)

    receta_completa = Receta(
        codigo_receta=generar_str("REC-COMP"),
        nombre_receta="Receta Galletas",
        producto_id=prod_completo.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    receta_no_aplica = Receta(
        codigo_receta=generar_str("REC-NOAP"),
        nombre_receta="Receta Pan Mostrador",
        producto_id=prod_no_aplica.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    session.add_all([receta_completa, receta_no_aplica])
    session.flush()

    paso_c = PasoReceta(
        receta_id=receta_completa.id,
        numero_orden=1,
        titulo="Mezcla",
        instrucciones="Mezclar",
    )
    paso_n = PasoReceta(
        receta_id=receta_no_aplica.id,
        numero_orden=1,
        titulo="Horneado",
        instrucciones="Hornear",
    )
    session.add_all([paso_c, paso_n])
    session.flush()

    session.add_all([
        PasoInsumo(paso_id=paso_c.id, insumo_id=harina.id, cantidad_consumo_estimada=300),
        PasoInsumo(paso_id=paso_c.id, insumo_id=azucar.id, cantidad_consumo_estimada=200),
        PasoInsumo(paso_id=paso_n.id, insumo_id=harina.id, cantidad_consumo_estimada=500),
    ])
    session.flush()

    lote = Lote(
        codigo_lote=generar_str("LOT"),
        producto_id=prod_completo.id,
        receta_id=receta_completa.id,
        operador_id=usuario.id,
        fecha_elaboracion=datetime.now(),
        fecha_vencimiento=date.today() + timedelta(days=180),
        cantidad_producida=Decimal("10"),
    )
    session.add(lote)
    session.commit()

    return {
        "prod_completo": prod_completo,
        "prod_no_aplica": prod_no_aplica,
        "prod_sin_receta": prod_sin_receta,
        "lote": lote,
    }


def test_vista_previa_producto_completo_con_sellos_sin_advertencias(setup_vista_previa):
    prod = setup_vista_previa["prod_completo"]

    res_rotulo = client.get(f"/productos/{prod.id}/rotulo")
    assert res_rotulo.status_code == 200
    base = res_rotulo.json()

    res_put = client.put(
        f"/productos/{prod.id}/rotulo",
        json={
            "denominacion_venta": "Galletitas dulces sabor vainilla",
            "contenido_neto": "200 g",
            "razon_social_elaborador": base["razon_social_elaborador"],
            "domicilio_elaborador": base["domicilio_elaborador"],
            "pais_origen": "Argentina",
            "rne_elaborador": "04-001122",
            "rnpa_rppa": "04-099887",
            "codigo_lote_declarado": base["codigo_lote_declarado"],
            "fecha_duracion_minima": base["fecha_duracion_minima"],
            "condiciones_conservacion": "Mantener en lugar fresco y seco.",
            "lista_ingredientes_texto": base["lista_ingredientes_texto"],
            "tamano_porcion_declarado": base["tamano_porcion_declarado"],
            "leyenda_vd_declarada": base["leyenda_vd_declarada"],
            "tabla_nutricional_json": base["tabla_nutricional_json"],
            "sellos_advertencia_json": base["sellos_advertencia_json"],
            "leyendas_precautorias_json": base["leyendas_precautorias_json"],
            "alergenos_presentes_json": base["alergenos_presentes_json"],
            "leyenda_alergenos_declarada": base["leyenda_alergenos_declarada"],
            "confirmar_alergenos_conservacion": True,
        },
    )
    assert res_put.status_code == 200

    res = client.get(f"/productos/{prod.id}/rotulo/vista-previa")
    assert res.status_code == 200
    data = res.json()

    assert data["leyenda_borrador_obligatoria"] == LEYENDA_BORRADOR_ROTULO
    assert data["cara_principal"]["denominacion_venta"] == "Galletitas dulces sabor vainilla"
    assert data["cara_principal"]["contenido_neto"] == "200 g"
    assert data["cara_principal"]["dictamen_aplicabilidad"] == "APLICA"
    assert any(s["codigo"] == "EXCESO_AZUCARES" for s in data["cara_principal"]["sellos_advertencia"])
    assert data["cara_principal"]["aviso_sin_sellos"] is None
    assert "Harina de trigo 000" in data["lista_ingredientes_texto"]
    assert "TRIGO" in data["leyenda_alergenos_declarada"]
    assert data["nutricion"]["es_completa"] is True
    assert data["tabla_nutricional_incompleta"] is False
    assert data["origen"]["rne_elaborador"] == "04-001122"
    assert data["origen"]["rnpa_rppa"] == "04-099887"
    assert data["completitud_caa"]["esta_completo"] is True
    assert data["advertencias"] == []


def test_vista_previa_producto_no_aplica_muestra_aviso_informativo(setup_vista_previa):
    prod = setup_vista_previa["prod_no_aplica"]

    res = client.get(f"/productos/{prod.id}/rotulo/vista-previa")
    assert res.status_code == 200
    data = res.json()

    assert data["leyenda_borrador_obligatoria"] == LEYENDA_BORRADOR_ROTULO
    assert data["cara_principal"]["dictamen_aplicabilidad"] == "NO_APLICA"
    assert data["cara_principal"]["sellos_calculables"] is True
    assert data["cara_principal"]["sellos_advertencia"] == []
    assert data["cara_principal"]["aviso_sin_sellos"] is not None
    assert len(data["cara_principal"]["aviso_sin_sellos"]) > 0


def test_vista_previa_producto_sin_receta_advierte_incompletitud(setup_vista_previa):
    prod = setup_vista_previa["prod_sin_receta"]

    res = client.get(f"/productos/{prod.id}/rotulo/vista-previa")
    assert res.status_code == 200
    data = res.json()

    assert data["leyenda_borrador_obligatoria"] == LEYENDA_BORRADOR_ROTULO
    assert data["tiene_receta_activa"] is False
    assert data["cara_principal"]["sellos_calculables"] is False
    assert data["tabla_nutricional_incompleta"] is True
    assert data["nutricion"]["es_completa"] is False
    assert data["nutricion"]["motivo_incompleta"] is not None
    assert data["completitud_caa"]["esta_completo"] is False
    assert len(data["advertencias"]) >= 3


def test_vista_previa_aplica_con_nutricion_incompleta_advierte_en_cara_principal(session, setup_vista_previa):
    um_masa = session.query(UnidadMedida).first()
    usuario = session.query(Persona).first()
    insumo_pend = Insumo(
        nombre=generar_str("SesamoPend"),
        denominacion_rotulo="Semillas de sésamo",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
    )
    prod_pend = Producto(
        nombre=generar_str("Pan Pendiente"),
        descripcion="Aplica rotulado frontal pero sin nutrición completa",
        unidad_medida_id=um_masa.id,
        dias_vida_util=5,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    session.add_all([insumo_pend, prod_pend])
    session.commit()
    session.refresh(insumo_pend)
    session.refresh(prod_pend)

    receta = Receta(
        codigo_receta=generar_str("REC-INC"),
        nombre_receta="Receta Pan Pendiente",
        producto_id=prod_pend.id,
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
        instrucciones="Mezclar",
    )
    session.add(paso)
    session.flush()
    session.add(PasoInsumo(paso_id=paso.id, insumo_id=insumo_pend.id, cantidad_consumo_estimada=100))
    session.commit()

    res = client.get(f"/productos/{prod_pend.id}/rotulo/vista-previa")
    assert res.status_code == 200
    data = res.json()

    assert data["cara_principal"]["dictamen_aplicabilidad"] == "APLICA"
    assert data["cara_principal"]["sellos_calculables"] is False
    assert data["cara_principal"]["sellos_advertencia"] == []
    assert "No corresponden" not in (data["cara_principal"]["aviso_sin_sellos"] or "")
