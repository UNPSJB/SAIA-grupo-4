import random
import uuid
import pytest
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.recetas.constants import ErrorCode, EstadoReceta, TipoRecurso
from src.recetas.models import PasoReceta

# Modelos para inyectar datos falsos por ORM
from src.sectores.models import Sector
from src.equipos.models import Equipo
from src.insumos.models import Insumo
from src.unidad_medida.models import UnidadMedida

client = TestClient(app)


def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def datos_base(session):
    s = Sector(nombre=generar_string_unico("Sector"), activo=True)
    um = UnidadMedida(
        nombre=generar_string_unico("Kilogramo"),
        simbolo="kg",
        tipo_magnitud="Masa",
        disponible=True,
    )
    session.add_all([s, um])
    session.commit()
    session.refresh(s)
    session.refresh(um)

    eq = Equipo(
        nombre=generar_string_unico("Equipo"),
        marca="Test",
        numero_serie=generar_string_unico("SN"),
        categoria="Maquinaria",
        sector_id=s.id,
        activo=True,
    )
    eq_inactivo = Equipo(
        nombre=generar_string_unico("EquipoInactivo"),
        marca="Test",
        numero_serie=generar_string_unico("SNI"),
        categoria="Maquinaria",
        sector_id=s.id,
        activo=False,
    )
    ins = Insumo(
        nombre=generar_string_unico("Harina"),
        unidad_medida_id=um.id,
        categoria="materia prima",
        disponible=True,
    )
    ins_inactivo = Insumo(
        nombre=generar_string_unico("LevaduraInactiva"),
        unidad_medida_id=um.id,
        categoria="materia prima",
        disponible=False,
    )

    session.add_all([eq, eq_inactivo, ins, ins_inactivo])
    session.commit()
    for entidad in (eq, eq_inactivo, ins, ins_inactivo):
        session.refresh(entidad)

    return {
        "producto_id": random.randint(1, 5000),
        "otro_producto_id": random.randint(5001, 9999),
        "sector_id": s.id,
        "unidad_medida_id": um.id,
        "equipo_id": eq.id,
        "equipo_inactivo_id": eq_inactivo.id,
        "insumo_id": ins.id,
        "insumo_inactivo_id": ins_inactivo.id,
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
    res_rend = client.post("/recetas/", json={
        "nombre_receta": "Receta Inválida",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 0,
    })
    assert res_rend.status_code == 422

    res_nombre = client.post("/recetas/", json={
        "nombre_receta": "",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 10,
    })
    assert res_nombre.status_code == 422


# BORRADORES Y RETOMAR

def test_permitir_multiples_borradores_y_retomar_viejo(datos_base):
    res_viejo = client.post("/recetas/", json={
        "nombre_receta": "Borrador Viejo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 10,
    })
    assert res_viejo.status_code == 201
    viejo_id = res_viejo.json()["id"]

    res_nuevo = client.post("/recetas/", json={
        "nombre_receta": "Borrador Nuevo",
        "producto_id": datos_base["otro_producto_id"],
        "rendimiento_estandar": 25,
    })
    assert res_nuevo.status_code == 201
    nuevo_id = res_nuevo.json()["id"]

    assert client.get("/recetas/borrador").json()["id"] == nuevo_id

    res_retomar = client.post(f"/recetas/{viejo_id}/retomar")
    assert res_retomar.status_code == 200

    assert client.get("/recetas/borrador").json()["id"] == viejo_id


def test_retomar_receta_que_no_es_borrador_falla(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Receta Activa",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res.json()["id"]
    
    # Inyectar paso para permitir activación
    client.post(f"/recetas/{receta_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{receta_id}/activar")

    res_retomar = client.post(f"/recetas/{receta_id}/retomar")
    assert res_retomar.status_code == 400
    assert res_retomar.json()["detail"] == ErrorCode.RECETA_NO_ES_BORRADOR


# ACTIVACIÓN Y REEMPLAZO ATÓMICO POR PRODUCTO

def test_activar_receta_inhabilita_anterior_del_mismo_producto(datos_base):
    prod_a = datos_base["producto_id"]
    prod_b = datos_base["otro_producto_id"]

    # 1. Crear y activar V1 del Producto A
    r1 = client.post("/recetas/", json={
        "nombre_receta": "Pan V1", "producto_id": prod_a, "rendimiento_estandar": 50
    }).json()
    client.post(f"/recetas/{r1['id']}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    res_act1 = client.post(f"/recetas/{r1['id']}/activar")
    assert res_act1.status_code == 200
    assert res_act1.json()["estado"] == EstadoReceta.ACTIVA.value

    # 2. Crear y activar receta de OTRO producto (Producto B)
    r_otro = client.post("/recetas/", json={
        "nombre_receta": "Pizzeta V1", "producto_id": prod_b, "rendimiento_estandar": 30
    }).json()
    client.post(f"/recetas/{r_otro['id']}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{r_otro['id']}/activar")

    # 3. Crear y activar V2 para el Producto A
    r2 = client.post("/recetas/", json={
        "nombre_receta": "Pan V2", "producto_id": prod_a, "rendimiento_estandar": 60
    }).json()
    client.post(f"/recetas/{r2['id']}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    res_act2 = client.post(f"/recetas/{r2['id']}/activar")
    assert res_act2.status_code == 200
    assert res_act2.json()["estado"] == EstadoReceta.ACTIVA.value

    # 4. V1 del Producto A debió pasar a INHABILITADA
    r1_final = client.get(f"/recetas/{r1['id']}").json()
    assert r1_final["estado"] == EstadoReceta.INHABILITADA.value

    # 5. La receta activa del Producto B NO debe verse afectada
    r_otro_final = client.get(f"/recetas/{r_otro['id']}").json()
    assert r_otro_final["estado"] == EstadoReceta.ACTIVA.value


# EDICIÓN, ESTADOS E INMUTABILIDAD CON LOTES

def test_modificar_receta_borrador_y_activa_sin_lotes(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Original",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res.json()["id"]

    res_patch1 = client.patch(f"/recetas/{receta_id}", json={
        "nombre_receta": "Editada en Borrador",
        "tiempo_estimado_total": 45,
    })
    assert res_patch1.status_code == 200

    # Inyectar paso para activar
    client.post(f"/recetas/{receta_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
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

    client.post(f"/recetas/{receta_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{receta_id}/activar")
    res_inh = client.post(f"/recetas/{receta_id}/inhabilitar")
    assert res_inh.status_code == 200

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

    res_fail = client.post(f"/recetas/{receta_id}/pasar-a-borrador")
    assert res_fail.status_code == 400

    client.post(f"/recetas/{receta_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{receta_id}/activar")
    
    res_ok = client.post(f"/recetas/{receta_id}/pasar-a-borrador")
    assert res_ok.status_code == 200
    assert res_ok.json()["estado"] == EstadoReceta.BORRADOR.value


@pytest.mark.skip(reason="TODO: Habilitar cuando exista el módulo de Lotes.")
def test_bloqueo_edicion_y_pasar_a_borrador_cuando_tiene_lotes(datos_base):
    res = client.post("/recetas/", json={
        "nombre_receta": "Receta Con Lotes",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 100,
    })
    receta_id = res.json()["id"]
    
    client.post(f"/recetas/{receta_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{receta_id}/activar")

    res_patch = client.patch(f"/recetas/{receta_id}", json={"nombre_receta": "Prohibido"})
    assert res_patch.status_code == 400
    
    res_borrador = client.post(f"/recetas/{receta_id}/pasar-a-borrador")
    assert res_borrador.status_code == 400


# CLONAR Y DESCARTAR

def test_clonar_receta_crea_nuevo_borrador(datos_base):
    res_origen = client.post("/recetas/", json={
        "nombre_receta": "Receta Madre",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 150,
        "tiempo_estimado_total": 90,
        "observaciones": "Nota original",
    })
    origen_id = res_origen.json()["id"]
    
    client.post(f"/recetas/{origen_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{origen_id}/activar")

    res_clon = client.post(f"/recetas/{origen_id}/clonar")
    assert res_clon.status_code == 201

    clon = res_clon.json()
    assert clon["id"] != origen_id
    assert clon["estado"] == EstadoReceta.BORRADOR.value


def test_clonar_receta_con_recurso_inactivo_crea_borrador_y_bloquea_activacion(datos_base, session):
    res_origen = client.post("/recetas/", json={
        "nombre_receta": "Receta Con Equipo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 100,
    })
    origen_id = res_origen.json()["id"]

    client.post(f"/recetas/{origen_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso 1",
        "instrucciones": "Usar equipo",
        "equipos": [{"equipo_id": datos_base["equipo_id"], "cantidad": 1}],
    })
    client.post(f"/recetas/{origen_id}/activar")

    # Se inactiva el equipo en la base de datos
    equipo = session.get(Equipo, datos_base["equipo_id"])
    equipo.activo = False
    session.commit()

    # Clonar debe ser exitoso porque genera un BORRADOR
    res_clon = client.post(f"/recetas/{origen_id}/clonar")
    assert res_clon.status_code == 201
    clon_id = res_clon.json()["id"]

    # El paso clonado conserva la información y refleja que el equipo está inactivo
    clon_data = client.get(f"/recetas/{clon_id}").json()
    assert len(clon_data["pasos"]) == 1
    assert clon_data["pasos"][0]["equipos"][0]["equipo"]["activo"] is False

    # Activar el borrador clonado DEBE fallar porque contiene el recurso inactivo
    res_activar = client.post(f"/recetas/{clon_id}/activar")
    assert res_activar.status_code == 409
    assert res_activar.json()["detail"]["code"] == ErrorCode.RECURSO_ASOCIADO_INACTIVO



def test_descartar_borrador_exitoso_y_falla_en_activa(datos_base):
    res_borrador = client.post("/recetas/", json={
        "nombre_receta": "Borrador Descartable",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    borrador_id = res_borrador.json()["id"]

    res_del = client.delete(f"/recetas/{borrador_id}/descartar")
    assert res_del.status_code == 204

    res_activa = client.post("/recetas/", json={
        "nombre_receta": "No Descartable",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    activa_id = res_activa.json()["id"]
    
    client.post(f"/recetas/{activa_id}/pasos", json={"numero_orden": 1, "titulo": "Paso 1", "instrucciones": "Instrucciones de prueba"})
    client.post(f"/recetas/{activa_id}/activar")

    res_del_fail = client.delete(f"/recetas/{activa_id}/descartar")
    assert res_del_fail.status_code == 400


# PASOS DE RECETA

def test_agregar_paso_a_receta_exitoso(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Pan Casero",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    payload = {
        "numero_orden": 1,
        "titulo": "Amasado inicial",
        "instrucciones": "Mezclar los ingredientes secos con agua tibia.",
        "equipos": [{"equipo_id": datos_base["equipo_id"], "cantidad": 2}],
        "insumos": [{"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 5.5}],
    }
    response = client.post(f"/recetas/{receta_id}/pasos", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["titulo"] == payload["titulo"]
    assert len(data["equipos"]) == 1
    assert len(data["insumos"]) == 1


def test_numero_orden_duplicado_al_agregar_o_modificar_paso_falla(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Pasos Unicos",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    res_p1 = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso 1",
        "instrucciones": "Hacer paso 1",
    })
    assert res_p1.status_code == 201

    # Intentar agregar otro paso con el mismo numero_orden = 1
    res_p1_dup = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso 1 Repetido",
        "instrucciones": "Hacer paso 1 otra vez",
    })
    assert res_p1_dup.status_code == 409
    assert res_p1_dup.json()["detail"] == ErrorCode.NUMERO_ORDEN_DUPLICADO

    # Agregar paso con numero_orden = 2
    res_p2 = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 2,
        "titulo": "Paso 2",
        "instrucciones": "Hacer paso 2",
    })
    assert res_p2.status_code == 201
    p2_id = res_p2.json()["id"]

    # Intentar modificar el paso 2 para que tenga numero_orden = 1 (duplicado)
    res_p2_mod_dup = client.patch(f"/recetas/pasos/{p2_id}", json={
        "numero_orden": 1,
    })
    assert res_p2_mod_dup.status_code == 409
    assert res_p2_mod_dup.json()["detail"] == ErrorCode.NUMERO_ORDEN_DUPLICADO

    # Modificar el paso 2 con el mismo numero_orden = 2 debe ser exitoso (sin cambiar orden)
    res_p2_mod_ok = client.patch(f"/recetas/pasos/{p2_id}", json={
        "numero_orden": 2,
        "titulo": "Paso 2 Actualizado",
    })
    assert res_p2_mod_ok.status_code == 200
    assert res_p2_mod_ok.json()["titulo"] == "Paso 2 Actualizado"



def test_listar_pasos_de_receta_ordenados_cronologicamente(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Ordenada",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 2, "titulo": "Horneado", "instrucciones": "Hornear a 180."
    })
    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Preparación", "instrucciones": "Pesar."
    })

    res_lista = client.get(f"/recetas/{receta_id}/pasos")
    assert res_lista.status_code == 200

    pasos = res_lista.json()
    assert len(pasos) == 2
    assert pasos[0]["numero_orden"] == 1
    assert pasos[1]["numero_orden"] == 2


def test_obtener_paso_por_id_exitoso_e_inexistente(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Detalle",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    res_paso = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Fermentado", "instrucciones": "Dejar reposar."
    })
    paso_id = res_paso.json()["id"]

    res_get = client.get(f"/recetas/pasos/{paso_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == paso_id

    assert client.get("/recetas/pasos/99999").status_code == 404


def test_agregar_paso_a_receta_no_borrador_falla(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Para Activar",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Paso Base", "instrucciones": "Válidas.",
    })
    client.post(f"/recetas/{receta_id}/activar")

    res_nuevo = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 2, "titulo": "Paso Prohibido", "instrucciones": "Instrucciones de prueba",
    })
    assert res_nuevo.status_code == 400


def test_agregar_paso_con_recursos_inactivos_falla(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Recursos Inactivos",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    res_eq = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Titulo valido", "instrucciones": "Instrucciones de prueba",
        "equipos": [{"equipo_id": datos_base["equipo_inactivo_id"], "cantidad": 1}],
    })
    assert res_eq.status_code == 409

    res_ins = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Titulo valido", "instrucciones": "Instrucciones de prueba",
        "insumos": [{"insumo_id": datos_base["insumo_inactivo_id"], "cantidad_consumo_estimada": 2.0}],
    })
    assert res_ins.status_code == 409


def test_validaciones_pydantic_paso_receta(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Validaciones",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    assert client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 0, "titulo": "Válido", "instrucciones": "Válido.",
    }).status_code == 422

    assert client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Ab", "instrucciones": "Válidas.",
    }).status_code == 422


def test_paso_filtra_recursos_duplicados(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Anti-Duplicados",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    res_paso = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Duplicados", "instrucciones": "Test.",
        "equipos": [
            {"equipo_id": datos_base["equipo_id"], "cantidad": 1},
            {"equipo_id": datos_base["equipo_id"], "cantidad": 2},
        ],
        "insumos": [
            {"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 1.5},
            {"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 3.0},
        ],
    })
    assert res_paso.status_code == 201
    
    paso_data = res_paso.json()
    assert len(paso_data["equipos"]) == 1
    assert len(paso_data["insumos"]) == 1

    res_patch = client.patch(f"/recetas/pasos/{paso_data['id']}", json={
        "equipos": [
            {"equipo_id": datos_base["equipo_id"], "cantidad": 3},
            {"equipo_id": datos_base["equipo_id"], "cantidad": 4},
        ]
    })
    assert res_patch.status_code == 200
    assert len(res_patch.json()["equipos"]) == 1


def test_modificar_y_eliminar_paso_de_receta_no_borrador_falla(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Inmutable",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    res_paso = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1, "titulo": "Intocable", "instrucciones": "Instrucciones de prueba",
    })
    paso_id = res_paso.json()["id"]

    client.post(f"/recetas/{receta_id}/activar")

    assert client.patch(f"/recetas/pasos/{paso_id}", json={"titulo": "Nuevo"}).status_code == 400
    assert client.delete(f"/recetas/pasos/{paso_id}").status_code == 400


def test_eliminar_paso_en_borrador_exitoso(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Borrar Paso",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    
    res_paso = client.post(f"/recetas/{res_receta.json()['id']}/pasos", json={
        "numero_orden": 1, "titulo": "Efímero", "instrucciones": "Instrucciones de prueba",
    })
    paso_id = res_paso.json()["id"]

    assert client.delete(f"/recetas/pasos/{paso_id}").status_code == 204
    assert client.get(f"/recetas/pasos/{paso_id}").status_code == 404


def test_activar_receta_sin_pasos_falla(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Vacía",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    assert client.post(f"/recetas/{res_receta.json()['id']}/activar").status_code == 400