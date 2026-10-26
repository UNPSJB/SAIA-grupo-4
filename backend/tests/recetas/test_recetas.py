import random
import pytest
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.recetas.constants import ErrorCode, EstadoReceta

client = TestClient(app)


@pytest.fixture
def datos_base(session):
    return {
        "producto_id": random.randint(1, 5000),
        "otro_producto_id": random.randint(5001, 9999),
    }


def test_crear_receta_borrador_exitoso(datos_base):
    payload = {
        "nombre_receta": "Pan de Molde Sésamo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": "100.50",
        "tiempo_estimado_total": 120,
        "observaciones": "Amasar con cuidado",
    }

    response = client.post("/recetas/", json=payload)
    assert response.status_code == 201, response.text

    data = response.json()
    assert data["nombre_receta"] == payload["nombre_receta"]
    assert data["producto_id"] == payload["producto_id"]
    assert float(data["rendimiento_estandar"]) == 100.50
    assert data["tiempo_estimado_total"] == 120
    assert data["estado"] == EstadoReceta.BORRADOR.value
    assert data["codigo_receta"].startswith("REC-")
    assert data["tiene_lotes"] is False
    assert data["pasos"] == []


def test_codigo_receta_es_incremental(datos_base):
    res1 = client.post("/recetas/", json={
        "nombre_receta": "Receta 1",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 10,
    })
    res2 = client.post("/recetas/", json={
        "nombre_receta": "Receta 2",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 20,
    })

    assert res1.status_code == 201
    assert res2.status_code == 201

    num1 = int(res1.json()["codigo_receta"].split("-")[1])
    num2 = int(res2.json()["codigo_receta"].split("-")[1])
    assert num2 == num1 + 1


def test_validaciones_pydantic_crear_receta(datos_base):
    # Rendimiento menor o igual a 0 debe fallar con 422
    res_rend = client.post("/recetas/", json={
        "nombre_receta": "Receta Inválida",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 0,
    })
    assert res_rend.status_code == 422

    # Nombre vacío debe fallar con 422
    res_nombre = client.post("/recetas/", json={
        "nombre_receta": "",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 10,
    })
    assert res_nombre.status_code == 422


# --- BORRADORES Y RETOMAR ---

def test_permitir_multiples_borradores_y_retomar_viejo(datos_base):
    # 1. Crear primer borrador (quedará viejo)
    res_viejo = client.post("/recetas/", json={
        "nombre_receta": "Borrador Viejo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 10,
    })
    assert res_viejo.status_code == 201
    viejo_id = res_viejo.json()["id"]

    # 2. Crear segundo borrador (pasa a ser el más reciente)
    res_nuevo = client.post("/recetas/", json={
        "nombre_receta": "Borrador Nuevo",
        "producto_id": datos_base["otro_producto_id"],
        "rendimiento_estandar": 25,
    })
    assert res_nuevo.status_code == 201
    nuevo_id = res_nuevo.json()["id"]

    # El endpoint /borrador devuelve el nuevo
    assert client.get("/recetas/borrador").json()["id"] == nuevo_id

    # 3. Retomar el borrador viejo
    res_retomar = client.post(f"/recetas/{viejo_id}/retomar")
    assert res_retomar.status_code == 200

    # Ahora GET /borrador devuelve el que se retomo
    assert client.get("/recetas/borrador").json()["id"] == viejo_id


def test_retomar_receta_que_no_es_borrador_falla(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Receta Activa",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res.json()["id"]
    client.post(f"/recetas/{receta_id}/activar")

    res_retomar = client.post(f"/recetas/{receta_id}/retomar")
    assert res_retomar.status_code == 400
    assert res_retomar.json()["detail"] == ErrorCode.RECETA_NO_ES_BORRADOR


# --- ACTIVACIÓN Y REEMPLAZO ATÓMICO POR PRODUCTO ---

def test_activar_receta_inhabilita_anterior_del_mismo_producto(datos_base):
    prod_a = datos_base["producto_id"]
    prod_b = datos_base["otro_producto_id"]

    # 1. Crear y activar V1 del Producto A
    r1 = client.post("/recetas/", json={
        "nombre_receta": "Pan V1", "producto_id": prod_a, "rendimiento_estandar": 50
    }).json()
    res_act1 = client.post(f"/recetas/{r1['id']}/activar")
    assert res_act1.status_code == 200
    assert res_act1.json()["estado"] == EstadoReceta.ACTIVA.value

    # 2. Crear y activar receta de OTRO producto (Producto B)
    r_otro = client.post("/recetas/", json={
        "nombre_receta": "Pizzeta V1", "producto_id": prod_b, "rendimiento_estandar": 30
    }).json()
    client.post(f"/recetas/{r_otro['id']}/activar")

    # 3. Crear y activar V2 para el Producto A
    r2 = client.post("/recetas/", json={
        "nombre_receta": "Pan V2", "producto_id": prod_a, "rendimiento_estandar": 60
    }).json()
    res_act2 = client.post(f"/recetas/{r2['id']}/activar")
    assert res_act2.status_code == 200
    assert res_act2.json()["estado"] == EstadoReceta.ACTIVA.value

    # 4. V1 del Producto A debió pasar a INHABILITADA automáticamente
    r1_final = client.get(f"/recetas/{r1['id']}").json()
    assert r1_final["estado"] == EstadoReceta.INHABILITADA.value

    # 5. La receta activa del Producto B NO debe haberse visto afectada
    r_otro_final = client.get(f"/recetas/{r_otro['id']}").json()
    assert r_otro_final["estado"] == EstadoReceta.ACTIVA.value


# --- EDICIÓN, ESTADOS E INMUTABILIDAD CON LOTES ---

def test_modificar_receta_borrador_y_activa_sin_lotes(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Original",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res.json()["id"]

    # Modificar en BORRADOR
    res_patch1 = client.patch(f"/recetas/{receta_id}", json={
        "nombre_receta": "Editada en Borrador",
        "tiempo_estimado_total": 45,
    })
    assert res_patch1.status_code == 200
    assert res_patch1.json()["nombre_receta"] == "Editada en Borrador"
    assert res_patch1.json()["tiempo_estimado_total"] == 45

    # Activar y modificar estando ACTIVA (como tiene_lotes es False, debe permitirlo)
    client.post(f"/recetas/{receta_id}/activar")
    res_patch2 = client.patch(f"/recetas/{receta_id}", json={
        "nombre_receta": "Editada en Activa",
    })
    assert res_patch2.status_code == 200
    assert res_patch2.json()["nombre_receta"] == "Editada en Activa"


def test_modificar_receta_inhabilitada_falla(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Para Inhabilitar",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res.json()["id"]

    client.post(f"/recetas/{receta_id}/activar")
    res_inh = client.post(f"/recetas/{receta_id}/inhabilitar")
    assert res_inh.status_code == 200
    assert res_inh.json()["estado"] == EstadoReceta.INHABILITADA.value

    res_patch = client.patch(f"/recetas/{receta_id}", json={"nombre_receta": "Intento edición"})
    assert res_patch.status_code == 400
    assert res_patch.json()["detail"] == ErrorCode.RECETA_INHABILITADA_NO_EDITABLE


def test_pasar_a_borrador_exitoso_y_falla_si_no_esta_activa(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Receta",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res.json()["id"]

    # Si ya es borrador, pasar_a_borrador debe fallar con RECETA_NO_ACTIVA
    res_fail = client.post(f"/recetas/{receta_id}/pasar-a-borrador")
    assert res_fail.status_code == 400
    assert res_fail.json()["detail"] == ErrorCode.RECETA_NO_ACTIVA

    # La activamos y ahora sí debe poder volver a borrador
    client.post(f"/recetas/{receta_id}/activar")
    res_ok = client.post(f"/recetas/{receta_id}/pasar-a-borrador")
    assert res_ok.status_code == 200
    assert res_ok.json()["estado"] == EstadoReceta.BORRADOR.value


@pytest.mark.skip(reason="TODO: Habilitar cuando exista el módulo de Lotes y se pueda testear con datos reales.")
def test_bloqueo_edicion_y_pasar_a_borrador_cuando_tiene_lotes(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Receta Con Lotes",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 100,
    })
    receta_id = res.json()["id"]
    client.post(f"/recetas/{receta_id}/activar")

    # TODO: Acá habrá que crear un lote real asociado a esta receta en la BD
    # para que receta.tiene_lotes devuelva True naturalmente.

    # 1. Intentar editar por PATCH debe fallar
    res_patch = client.patch(f"/recetas/{receta_id}", json={"nombre_receta": "Prohibido"})
    assert res_patch.status_code == 400
    assert res_patch.json()["detail"] == ErrorCode.RECETA_CON_LOTES_NO_EDITABLE

    # 2. Intentar pasarla a borrador también debe fallar
    res_borrador = client.post(f"/recetas/{receta_id}/pasar-a-borrador")
    assert res_borrador.status_code == 400
    assert res_borrador.json()["detail"] == ErrorCode.RECETA_CON_LOTES_NO_EDITABLE


# --- CLONAR Y DESCARTAR ---

def test_clonar_receta_crea_nuevo_borrador(datos_base):
    res_origen = client.post("/recetas/", json={
        "nombre_receta": "Receta Madre",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 150,
        "tiempo_estimado_total": 90,
        "observaciones": "Nota original",
    })
    origen_id = res_origen.json()["id"]
    client.post(f"/recetas/{origen_id}/activar")

    res_clon = client.post(f"/recetas/{origen_id}/clonar")
    assert res_clon.status_code == 201

    clon = res_clon.json()
    assert clon["id"] != origen_id
    assert clon["codigo_receta"] != res_origen.json()["codigo_receta"]
    assert clon["nombre_receta"] == "Receta Madre"
    assert clon["producto_id"] == datos_base["producto_id"]
    assert float(clon["rendimiento_estandar"]) == 150.0
    assert clon["tiempo_estimado_total"] == 90
    assert clon["observaciones"] == "Nota original"
    assert clon["estado"] == EstadoReceta.BORRADOR.value


def test_descartar_borrador_exitoso_y_falla_en_activa(datos_base):
    # 1. Descartar un borrador lo elimina físicamente
    res_borrador = client.post("/recetas/", json={
        "nombre_receta": "Borrador Descartable",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    borrador_id = res_borrador.json()["id"]

    res_del = client.delete(f"/recetas/{borrador_id}/descartar")
    assert res_del.status_code == 204
    assert client.get(f"/recetas/{borrador_id}").status_code == 404

    # 2. Intentar descartar una receta ACTIVA debe fallar con 400
    res_activa = client.post("/recetas/", json={
        "nombre_receta": "No Descartable",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    activa_id = res_activa.json()["id"]
    client.post(f"/recetas/{activa_id}/activar")

    res_del_fail = client.delete(f"/recetas/{activa_id}/descartar")
    assert res_del_fail.status_code == 400
    assert res_del_fail.json()["detail"] == ErrorCode.RECETA_NO_ES_BORRADOR