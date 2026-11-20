from datetime import date, datetime
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.insumos.models import Insumo
from src.lotes.models import Lote
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


def test_bloqueo_inmutabilidad_con_lotes_y_receta_inhabilitada(session, setup_datos):
    """Guarda de inmutabilidad: rechaza PUT de overrides si la receta está ACTIVA con lotes o INHABILITADA."""
    prod = setup_datos["prod_envasado"]
    receta = crear_receta_con_insumos(session, prod, [(setup_datos["harina"], 500)])

    # Sin lotes: debe permitir editar
    res_get = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res_get.status_code == 200
    assert res_get.json()["puede_editar_overrides"] is True

    # Asociar un lote a la receta activa
    lote = Lote(
        codigo_lote=generar_str("LOT"),
        producto_id=prod.id,
        receta_id=receta.id,
        operador_id=1,
        fecha_elaboracion=datetime.now(),
        fecha_vencimiento=date.today(),
        cantidad_producida=Decimal("10.00"),
    )
    session.add(lote)
    session.commit()

    res_get_con_lote = client.get(f"/recetas/{receta.id}/aplicabilidad-frontal")
    assert res_get_con_lote.status_code == 200
    assert res_get_con_lote.json()["puede_editar_overrides"] is False

    res_put_bloqueado = client.put(
        f"/recetas/{receta.id}/aplicabilidad-frontal",
        json={"override_azucares_agregados": True},
    )
    assert res_put_bloqueado.status_code == 409

    # Receta inhabilitada sin lotes también rechaza modificaciones
    receta_inh = crear_receta_con_insumos(session, prod, [(setup_datos["harina"], 500)])
    receta_inh.estado = EstadoReceta.INHABILITADA
    session.commit()

    res_get_inh = client.get(f"/recetas/{receta_inh.id}/aplicabilidad-frontal")
    assert res_get_inh.status_code == 200
    assert res_get_inh.json()["puede_editar_overrides"] is False

    res_put_inh = client.put(
        f"/recetas/{receta_inh.id}/aplicabilidad-frontal",
        json={"override_azucares_agregados": True},
    )
    assert res_put_inh.status_code == 409


def test_auto_deteccion_edulcorante_y_limpieza_envase_en_insumos(session, setup_datos):
    """Al crear un aditivo con clase funcional 'Edulcorante' se marca es_edulcorante=True automáticamente."""
    um = setup_datos["um"]

    res_aditivo = client.post(
        "/insumos/",
        json={
            "nombre": generar_str("aspartamo"),
            "unidad_medida_id": um.id,
            "categoria": "aditivo",
            "descripcion": "Edulcorante no nutritivo",
            "clase_funcional": "Edulcorante",
            "numero_ins": "951",
        },
    )
    assert res_aditivo.status_code == 201
    assert res_aditivo.json()["es_edulcorante"] is True

    res_envase = client.post(
        "/insumos/",
        json={
            "nombre": generar_str("bolsa"),
            "unidad_medida_id": um.id,
            "categoria": "envase",
            "descripcion": "Bolsa plastica",
            "aporta_azucares_agregados": True,
            "contiene_cafeina": True,
        },
    )
    assert res_envase.status_code == 201
    data_env = res_envase.json()
    assert data_env["aporta_azucares_agregados"] is False
    assert data_env["contiene_cafeina"] is False


def test_endpoints_configuracion_normativa_rotulado_frontal(session, setup_datos):
    """Permite leer, crear nuevas versiones al actualizar y restaurar la normativa de rotulado frontal."""
    res_get = client.get("/configuracion-nutricional/rotulado-frontal")
    assert res_get.status_code == 200
    norma = res_get.json()
    id_inicial = norma["id"]
    assert norma["codigo_normativa"] == "LEY_27642"
    assert norma["evalua_cafeina"] is True

    # Actualizar versión y desactivar evaluación de cafeína -> debe crear nueva instancia
    res_put = client.put(
        "/configuracion-nutricional/rotulado-frontal",
        json={
            "nombre": norma["nombre"],
            "version": "Etapa 3 - Custom",
            "requiere_envasado_ausencia_cliente": True,
            "evalua_azucares_agregados": True,
            "evalua_grasas_agregadas": True,
            "evalua_sodio_agregado": True,
            "evalua_edulcorantes": True,
            "evalua_cafeina": False,
            "descripcion": "Prueba de actualizacion",
        },
    )
    assert res_put.status_code == 200
    norma_nueva = res_put.json()
    assert norma_nueva["id"] > id_inicial
    assert norma_nueva["activa"] is True
    assert norma_nueva["version"] == "Etapa 3 - Custom"
    assert norma_nueva["evalua_cafeina"] is False

    norma_anterior = session.get(NormativaRotulado, id_inicial)
    session.refresh(norma_anterior)
    assert norma_anterior.activa is False

    # Guardar exactamente los mismos datos NO debe crear una nueva instancia
    res_put_igual = client.put(
        "/configuracion-nutricional/rotulado-frontal",
        json={
            "nombre": norma_nueva["nombre"],
            "version": norma_nueva["version"],
            "requiere_envasado_ausencia_cliente": norma_nueva["requiere_envasado_ausencia_cliente"],
            "evalua_azucares_agregados": norma_nueva["evalua_azucares_agregados"],
            "evalua_grasas_agregadas": norma_nueva["evalua_grasas_agregadas"],
            "evalua_sodio_agregado": norma_nueva["evalua_sodio_agregado"],
            "evalua_edulcorantes": norma_nueva["evalua_edulcorantes"],
            "evalua_cafeina": norma_nueva["evalua_cafeina"],
            "descripcion": norma_nueva["descripcion"],
        },
    )
    assert res_put_igual.status_code == 200
    assert res_put_igual.json()["id"] == norma_nueva["id"]

    # Restaurar defecto -> crea una nueva instancia activa con valores por defecto
    res_rest = client.post("/configuracion-nutricional/rotulado-frontal/restaurar-defecto")
    assert res_rest.status_code == 200
    norma_restaurada = res_rest.json()
    assert norma_restaurada["id"] > norma_nueva["id"]
    assert norma_restaurada["activa"] is True
    assert norma_restaurada["evalua_cafeina"] is True

    norma_intermedia = session.get(NormativaRotulado, norma_nueva["id"])
    session.refresh(norma_intermedia)
    assert norma_intermedia.activa is False


def test_versionado_normativa_y_asociacion_recetas(session, setup_datos):
    """Borradores y activas sin lotes migran a la nueva ley; activas con lotes e inhabilitadas conservan la anterior."""
    prod = setup_datos["prod_envasado"]
    norma_v1 = client.get("/configuracion-nutricional/rotulado-frontal").json()
    id_v1 = norma_v1["id"]

    # 1. Crear borrador vía endpoint POST /recetas/ -> debe asociarse a norma v1
    res_borr = client.post(
        "/recetas/",
        json={
            "nombre_receta": generar_str("Receta Borrador"),
            "producto_id": prod.id,
            "rendimiento_estandar": 1000.0,
        },
    )
    assert res_borr.status_code == 201
    borrador_id = res_borr.json()["id"]
    borrador = session.get(Receta, borrador_id)
    assert borrador.normativa_rotulado_id == id_v1

    # Agregar cafeína al borrador
    paso_b = PasoReceta(
        receta_id=borrador.id,
        numero_orden=1,
        titulo="Paso 1",
        instrucciones="Mezclar",
    )
    session.add(paso_b)
    session.flush()
    session.add(
        PasoInsumo(
            paso_id=paso_b.id,
            insumo_id=setup_datos["cafeina"].id,
            cantidad_consumo_estimada=10,
        )
    )
    session.commit()

    # 2. Activa sin lotes asociada a v1
    activa_sin_lotes = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 500), (setup_datos["cafeina"], 10)]
    )
    activa_sin_lotes.normativa_rotulado_id = id_v1

    # 3. Activa con lotes asociada a v1
    activa_con_lotes = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 500), (setup_datos["cafeina"], 10)]
    )
    activa_con_lotes.normativa_rotulado_id = id_v1
    session.add(
        Lote(
            codigo_lote=generar_str("LOT"),
            producto_id=prod.id,
            receta_id=activa_con_lotes.id,
            operador_id=1,
            fecha_elaboracion=datetime.now(),
            fecha_vencimiento=date.today(),
            cantidad_producida=Decimal("10.00"),
        )
    )

    # 4. Inhabilitada asociada a v1
    inhabilitada = crear_receta_con_insumos(
        session, prod, [(setup_datos["harina"], 500), (setup_datos["cafeina"], 10)]
    )
    inhabilitada.estado = EstadoReceta.INHABILITADA
    inhabilitada.normativa_rotulado_id = id_v1
    session.commit()

    # Guardar nueva versión de la normativa (v2) donde no se evalúa cafeína
    res_v2 = client.put(
        "/configuracion-nutricional/rotulado-frontal",
        json={
            "nombre": norma_v1["nombre"],
            "version": "Etapa 3 - Sin Cafeina",
            "requiere_envasado_ausencia_cliente": True,
            "evalua_azucares_agregados": True,
            "evalua_grasas_agregadas": True,
            "evalua_sodio_agregado": True,
            "evalua_edulcorantes": True,
            "evalua_cafeina": False,
            "descripcion": "Nueva version sin cafeina",
        },
    )
    assert res_v2.status_code == 200
    id_v2 = res_v2.json()["id"]
    assert id_v2 != id_v1

    session.expire_all()
    assert session.get(Receta, borrador.id).normativa_rotulado_id == id_v2
    assert session.get(Receta, activa_sin_lotes.id).normativa_rotulado_id == id_v2
    assert session.get(Receta, activa_con_lotes.id).normativa_rotulado_id == id_v1
    assert session.get(Receta, inhabilitada.id).normativa_rotulado_id == id_v1

    # Evaluación: las migradas a v2 quedan EXCEPTUADO; la con lotes sigue APLICA con v1
    assert (
        client.get(f"/recetas/{activa_sin_lotes.id}/aplicabilidad-frontal").json()["dictamen"]
        == DictamenAplicabilidad.EXCEPTUADO.value
    )
    assert (
        client.get(f"/recetas/{activa_con_lotes.id}/aplicabilidad-frontal").json()["dictamen"]
        == DictamenAplicabilidad.APLICA.value
    )

    # Al clonar la receta con lotes, el nuevo borrador se asocia a la normativa vigente (v2)
    res_clon = client.post(f"/recetas/{activa_con_lotes.id}/clonar")
    assert res_clon.status_code == 201
    clon_id = res_clon.json()["id"]
    assert session.get(Receta, clon_id).normativa_rotulado_id == id_v2
