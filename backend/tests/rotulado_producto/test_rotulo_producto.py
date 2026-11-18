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
from src.unidad_medida.models import UnidadMedida
from tests.database import session

client = TestClient(app)


def generar_str(prefijo: str) -> str:
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def setup_rotulo_producto(session):
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
            nombre_establecimiento="Establecimiento Test",
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
            apellido="Test",
            usuario=generar_str("admin"),
            clave="hash",
            activo=True,
        )
        session.add(usuario)
        session.commit()
        session.refresh(usuario)

    azucar = Insumo(
        nombre=generar_str("Azúcar"),
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
        nombre=generar_str("Harina 000"),
        denominacion_rotulo="Harina de trigo 000",
        categoria="materia prima",
        unidad_medida_id=um_masa.id,
        disponible=True,
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

    prod_sin_activa = Producto(
        nombre=generar_str("Producto Sin Receta Activa"),
        descripcion="Producto sin receta activa",
        unidad_medida_id=um_masa.id,
        dias_vida_util=90,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    prod_con_activa = Producto(
        nombre=generar_str("Galletitas Dulces"),
        descripcion="Galletitas con azúcar",
        unidad_medida_id=um_masa.id,
        dias_vida_util=180,
        envasado_ausencia_cliente=True,
        activo=True,
    )
    session.add_all([prod_sin_activa, prod_con_activa])
    session.commit()
    session.refresh(prod_sin_activa)
    session.refresh(prod_con_activa)

    receta_borrador = Receta(
        codigo_receta=generar_str("REC-BORR"),
        nombre_receta="Receta Borrador",
        producto_id=prod_sin_activa.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.BORRADOR,
        usuario_creador_id=usuario.id,
    )
    session.add(receta_borrador)
    session.flush()
    paso_b = PasoReceta(
        receta_id=receta_borrador.id,
        numero_orden=1,
        titulo="Mezcla",
        instrucciones="Mezclar",
    )
    session.add(paso_b)
    session.flush()
    session.add(
        PasoInsumo(paso_id=paso_b.id, insumo_id=harina.id, cantidad_consumo_estimada=500)
    )

    receta_activa = Receta(
        codigo_receta=generar_str("REC-ACT"),
        nombre_receta="Receta Galletitas",
        producto_id=prod_con_activa.id,
        rendimiento_estandar=Decimal("500"),
        tamano_porcion=Decimal("50"),
        estado=EstadoReceta.ACTIVA,
        usuario_creador_id=usuario.id,
    )
    session.add(receta_activa)
    session.flush()
    paso_a = PasoReceta(
        receta_id=receta_activa.id,
        numero_orden=1,
        titulo="Amasado",
        instrucciones="Mezclar harina y azúcar",
    )
    session.add(paso_a)
    session.flush()
    session.add_all([
        PasoInsumo(paso_id=paso_a.id, insumo_id=harina.id, cantidad_consumo_estimada=350),
        PasoInsumo(paso_id=paso_a.id, insumo_id=azucar.id, cantidad_consumo_estimada=150),
    ])
    session.commit()

    lote = Lote(
        codigo_lote=generar_str("LOT-GAL"),
        producto_id=prod_con_activa.id,
        receta_id=receta_activa.id,
        operador_id=usuario.id,
        fecha_elaboracion=datetime.now(),
        fecha_vencimiento=date.today() + timedelta(days=180),
        cantidad_producida=Decimal("500"),
    )
    session.add(lote)
    session.commit()
    session.refresh(lote)

    return {
        "prod_sin_activa": prod_sin_activa,
        "prod_con_activa": prod_con_activa,
        "receta_activa": receta_activa,
        "lote": lote,
    }


def test_producto_sin_receta_activa_no_precarga_y_permite_borrador_parcial(setup_rotulo_producto):
    prod = setup_rotulo_producto["prod_sin_activa"]

    res_get = client.get(f"/productos/{prod.id}/rotulo")
    assert res_get.status_code == 200
    data = res_get.json()

    assert data["guardado_en_bd"] is False
    assert data["autocompletado"]["tiene_receta_activa"] is False
    assert data["lista_ingredientes_texto"] is None
    assert data["tabla_nutricional_json"] == []
    assert data["sellos_advertencia_json"] == []
    assert data["razon_social_elaborador"] == "Alimentos SAIA S.A."

    res_put = client.put(
        f"/productos/{prod.id}/rotulo",
        json={
            "denominacion_venta": "Premezcla panadera",
            "rnpa_rppa": "04-055123",
        },
    )
    assert res_put.status_code == 200
    guardado = res_put.json()
    assert guardado["guardado_en_bd"] is True
    assert guardado["denominacion_venta"] == "Premezcla panadera"
    assert guardado["rnpa_rppa"] == "04-055123"
    assert guardado["completitud_caa"]["esta_completo"] is False
    assert "Contenido neto" in guardado["completitud_caa"]["campos_faltantes"]


def test_producto_con_receta_activa_y_lote_precarga_y_detecta_edicion_manual(setup_rotulo_producto):
    prod = setup_rotulo_producto["prod_con_activa"]
    lote = setup_rotulo_producto["lote"]

    res_get = client.get(f"/productos/{prod.id}/rotulo")
    assert res_get.status_code == 200
    data = res_get.json()

    assert data["autocompletado"]["tiene_receta_activa"] is True
    assert "Harina de trigo 000" in data["lista_ingredientes_texto"]
    assert len(data["tabla_nutricional_json"]) > 0
    assert any(s["codigo"] == "EXCESO_AZUCARES" for s in data["sellos_advertencia_json"])
    assert data["codigo_lote_declarado"] == lote.codigo_lote

    res_edit = client.put(
        f"/productos/{prod.id}/rotulo",
        json={
            "denominacion_venta": data["denominacion_venta"],
            "lista_ingredientes_texto": "Ingredientes editados manualmente: harina y azúcar.",
            "tabla_nutricional_json": data["tabla_nutricional_json"],
            "tamano_porcion_declarado": data["tamano_porcion_declarado"],
            "leyenda_vd_declarada": data["leyenda_vd_declarada"],
            "sellos_advertencia_json": [],
            "leyendas_precautorias_json": data["leyendas_precautorias_json"],
            "codigo_lote_declarado": data["codigo_lote_declarado"],
            "fecha_duracion_minima": data["fecha_duracion_minima"],
        },
    )
    assert res_edit.status_code == 200
    editado = res_edit.json()
    assert editado["ingredientes_modificado_manualmente"] is True
    assert editado["ingredientes_difiere_de_receta"] is True
    assert editado["sellos_modificados_manualmente"] is True
    assert editado["sellos_difieren_de_receta"] is True
    assert editado["nutricion_modificada_manualmente"] is False

    res_restore = client.put(
        f"/productos/{prod.id}/rotulo",
        json={
            "denominacion_venta": data["denominacion_venta"],
            "restaurar_ingredientes_automatico": True,
            "restaurar_sellos_automatico": True,
            "tabla_nutricional_json": data["tabla_nutricional_json"],
            "tamano_porcion_declarado": data["tamano_porcion_declarado"],
            "leyenda_vd_declarada": data["leyenda_vd_declarada"],
            "codigo_lote_declarado": data["codigo_lote_declarado"],
            "fecha_duracion_minima": data["fecha_duracion_minima"],
        },
    )
    assert res_restore.status_code == 200
    restaurado = res_restore.json()
    assert restaurado["ingredientes_modificado_manualmente"] is False
    assert restaurado["sellos_modificados_manualmente"] is False
    assert "Harina de trigo 000" in restaurado["lista_ingredientes_texto"]


def test_campos_condicionales_importador_y_completitud_100(setup_rotulo_producto):
    prod = setup_rotulo_producto["prod_con_activa"]
    inicial = client.get(f"/productos/{prod.id}/rotulo").json()

    payload_nacional = {
        "denominacion_venta": "Galletitas dulces",
        "contenido_neto": "250 g",
        "razon_social_elaborador": "Alimentos SAIA S.A.",
        "domicilio_elaborador": "Av. Siempre Viva 742, Córdoba",
        "pais_origen": "Argentina",
        "rne_elaborador": "04-000123",
        "rnpa_rppa": "04-055123",
        "es_importado": False,
        "codigo_lote_declarado": inicial["codigo_lote_declarado"],
        "fecha_duracion_minima": inicial["fecha_duracion_minima"],
        "condiciones_conservacion": "Conservar en lugar fresco y seco",
        "lista_ingredientes_texto": inicial["lista_ingredientes_texto"],
        "tamano_porcion_declarado": inicial["tamano_porcion_declarado"],
        "leyenda_vd_declarada": inicial["leyenda_vd_declarada"],
        "tabla_nutricional_json": inicial["tabla_nutricional_json"],
        "sellos_advertencia_json": inicial["sellos_advertencia_json"],
        "leyendas_precautorias_json": inicial["leyendas_precautorias_json"],
    }
    res_nac = client.put(f"/productos/{prod.id}/rotulo", json=payload_nacional)
    assert res_nac.status_code == 200
    assert res_nac.json()["completitud_caa"]["porcentaje"] == 100
    assert res_nac.json()["completitud_caa"]["esta_completo"] is True

    payload_imp_incompleto = {**payload_nacional, "es_importado": True}
    res_imp_inc = client.put(f"/productos/{prod.id}/rotulo", json=payload_imp_incompleto)
    assert res_imp_inc.status_code == 200
    comp_inc = res_imp_inc.json()["completitud_caa"]
    assert comp_inc["esta_completo"] is False
    assert "RNE del importador" in comp_inc["campos_faltantes"]

    payload_imp_ok = {
        **payload_imp_incompleto,
        "nombre_importador": "Importadora Sur S.R.L.",
        "domicilio_importador": "Puerto Madero 100, CABA",
        "rne_importador": "00-009999",
    }
    res_imp_ok = client.put(f"/productos/{prod.id}/rotulo", json=payload_imp_ok)
    assert res_imp_ok.status_code == 200
    assert res_imp_ok.json()["completitud_caa"]["esta_completo"] is True


def test_producto_inexistente_retorna_404():
    res = client.get("/productos/999999/rotulo")
    assert res.status_code == 404
