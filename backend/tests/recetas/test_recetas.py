import random
import uuid
import pytest
from fastapi.testclient import TestClient

from src.main import app
from tests.database import session
from src.recetas.constants import ErrorCode, EstadoReceta, TipoRecurso
from src.recetas.models import PasoReceta, PasoInsumo, Receta

# Modelos para inyectar datos falsos por ORM
from src.sectores.models import Sector
from src.equipos.models import Equipo
from src.insumos.models import Insumo
from src.unidad_medida.models import UnidadMedida
from src.productos.models import Producto

client = TestClient(app)


def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"


@pytest.fixture
def datos_base(session):
    s = Sector(nombre=generar_string_unico("Sector"), activo=True)
    um = UnidadMedida(
        nombre=generar_string_unico("Kilogramo"),
        simbolo="kg",
        tipo_magnitud="masa",
        disponible=True,
    )
    um_volumen = UnidadMedida(
        nombre=generar_string_unico("Litro"),
        simbolo="L",
        tipo_magnitud="volumen",
        disponible=True,
    )
    session.add_all([s, um, um_volumen])
    session.commit()
    session.refresh(s)
    session.refresh(um)
    session.refresh(um_volumen)

    eq = Equipo(
        nombre=generar_string_unico("Equipo"),
        marca="Test",
        numero_serie=generar_string_unico("SN"),
        categoria="horno",
        sector_id=s.id,
        activo=True,
    )
    eq_inactivo = Equipo(
        nombre=generar_string_unico("EquipoInactivo"),
        marca="Test",
        numero_serie=generar_string_unico("SNI"),
        categoria="horno",
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
    ins_liquido = Insumo(
        nombre=generar_string_unico("AguaMineral"),
        unidad_medida_id=um_volumen.id,
        categoria="materia prima",
        densidad_g_ml=1.0,
        disponible=True,
    )
    ins_aditivo = Insumo(
        nombre=generar_string_unico("SalFina"),
        unidad_medida_id=um.id,
        categoria="aditivo",
        clase_funcional="Conservante",
        numero_ins="282",
        disponible=True,
    )
    ins_sin_eq = Insumo(
        nombre=generar_string_unico("AceiteSinDensidad"),
        unidad_medida_id=um_volumen.id,
        categoria="materia prima",
        densidad_g_ml=None,
        disponible=True,
    )

    prod = Producto(
        nombre="Pan de Molde",
        descripcion="Pan blanco",
        unidad_medida_id=um.id,
        activo=True,
    )
    otro_prod = Producto(
        nombre="Medialunas de Grasa",
        descripcion="Medialunas",
        unidad_medida_id=um.id,
        activo=True,
    )
    prod_inactivo = Producto(
        nombre="Producto Inactivo",
        descripcion="Inactivo",
        unidad_medida_id=um.id,
        activo=False,
    )

    session.add_all([
        eq, eq_inactivo, ins, ins_inactivo, ins_liquido, ins_aditivo, ins_sin_eq,
        prod, otro_prod, prod_inactivo,
    ])
    session.commit()
    for entidad in (
        eq, eq_inactivo, ins, ins_inactivo, ins_liquido, ins_aditivo, ins_sin_eq,
        prod, otro_prod, prod_inactivo,
    ):
        session.refresh(entidad)

    return {
        "producto_id": prod.id,
        "otro_producto_id": otro_prod.id,
        "producto_inactivo_id": prod_inactivo.id,
        "producto_nombre": prod.nombre,
        "otro_producto_nombre": otro_prod.nombre,
        "sector_id": s.id,
        "unidad_medida_id": um.id,
        "unidad_medida_volumen_id": um_volumen.id,
        "equipo_id": eq.id,
        "equipo_nombre": eq.nombre,
        "equipo_inactivo_id": eq_inactivo.id,
        "insumo_id": ins.id,
        "insumo_nombre": ins.nombre,
        "insumo_inactivo_id": ins_inactivo.id,
        "insumo_liquido_id": ins_liquido.id,
        "insumo_liquido_nombre": ins_liquido.nombre,
        "insumo_aditivo_id": ins_aditivo.id,
        "insumo_aditivo_nombre": ins_aditivo.nombre,
        "insumo_sin_equivalencia_id": ins_sin_eq.id,
        "insumo_sin_equivalencia_nombre": ins_sin_eq.nombre,
    }


@pytest.fixture
def insumos_caa(session, datos_base):
    """Fixture secundario especializado para tests de Declaración de Ingredientes y Rótulo CAA (Cap. V).
    
    Provee una despensa completa con denominaciones de rótulo para cubrir:
    - Orden automático por proporción decreciente y desempate alfabético.
    - Orden manual con regla de frontera y restricción a porcentajes idénticos.
    - Agrupamiento de aditivos de la misma clase funcional y rechazo de fragmentación.
    """
    um_kg = session.get(UnidadMedida, datos_base["unidad_medida_id"])

    harina = Insumo(
        nombre=generar_string_unico("Harina"),
        denominacion_rotulo="Harina de trigo enriquecida",
        unidad_medida_id=um_kg.id,
        categoria="materia prima",
        disponible=True,
    )
    agua = Insumo(
        nombre="Agua Potable",
        denominacion_rotulo="Agua",
        unidad_medida_id=um_kg.id,
        categoria="materia prima",
        disponible=True,
    )
    azucar = Insumo(
        nombre="Azúcar Común",
        denominacion_rotulo="Azúcar común tipo A",
        unidad_medida_id=um_kg.id,
        categoria="materia prima",
        disponible=True,
    )
    conservante = Insumo(
        nombre="Propionato",
        denominacion_rotulo="Propionato de calcio",
        clase_funcional="Conservante",
        numero_ins="282",
        unidad_medida_id=um_kg.id,
        categoria="aditivo",
        disponible=True,
    )
    leudante_1 = Insumo(
        nombre="Bicarbonato de sodio",
        denominacion_rotulo="Bicarbonato de sodio",
        clase_funcional="Leudante químico",
        numero_ins="500ii",
        unidad_medida_id=um_kg.id,
        categoria="aditivo",
        disponible=True,
    )
    leudante_2 = Insumo(
        nombre="Pirofosfato ácido",
        denominacion_rotulo="Pirofosfato ácido de sodio",
        clase_funcional="Leudante químico",
        numero_ins="450i",
        unidad_medida_id=um_kg.id,
        categoria="aditivo",
        disponible=True,
    )
    aromatizante = Insumo(
        nombre="Aroma Vainilla",
        denominacion_rotulo="Aroma natural de vainilla",
        clase_funcional="Aromatizante",
        numero_ins=None,
        unidad_medida_id=um_kg.id,
        categoria="aditivo",
        disponible=True,
    )

    todos = [harina, agua, azucar, conservante, leudante_1, leudante_2, aromatizante]
    session.add_all(todos)
    session.commit()
    for entidad in todos:
        session.refresh(entidad)

    return {
        "harina": harina,
        "agua": agua,
        "azucar": azucar,
        "conservante": conservante,
        "leudante_1": leudante_1,
        "leudante_2": leudante_2,
        "aromatizante": aromatizante,
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

    num1 = int(res1.json()["codigo_receta"].split("-")[-1])
    num2 = int(res2.json()["codigo_receta"].split("-")[-1])
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
    assert r1_final["fecha_baja"] is not None

    # 5. La receta activa del Producto B NO debe verse afectada
    r_otro_final = client.get(f"/recetas/{r_otro['id']}").json()
    assert r_otro_final["estado"] == EstadoReceta.ACTIVA.value
    assert r_otro_final["fecha_baja"] is None


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
    assert res_inh.json()["fecha_baja"] is not None

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
    receta_id = res_receta.json()["id"]
    res_activar = client.post(f"/recetas/{receta_id}/activar")
    assert res_activar.status_code == 400


def test_autogeneracion_codigo_receta_con_prefijo_producto(datos_base):
    # prod1 es "Pan de Molde" -> prefijo PM -> REC-PM-001
    res1 = client.post("/recetas/", json={
        "nombre_receta": "Receta Pan Molde 1",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 100,
    })
    assert res1.status_code == 201
    assert res1.json()["codigo_receta"].startswith("REC-PM-")
    assert res1.json()["producto"]["nombre"] == "Pan de Molde"

    # Segunda receta de Pan de Molde
    res2 = client.post("/recetas/", json={
        "nombre_receta": "Receta Pan Molde 2",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 120,
    })
    assert res2.status_code == 201
    assert res2.json()["codigo_receta"].startswith("REC-PM-")

    # prod2 es "Medialunas de Grasa" -> prefijo MG -> REC-MG-001
    res3 = client.post("/recetas/", json={
        "nombre_receta": "Receta Medialunas",
        "producto_id": datos_base["otro_producto_id"],
        "rendimiento_estandar": 50,
    })
    assert res3.status_code == 201
    assert res3.json()["codigo_receta"].startswith("REC-MG-")


def test_crear_receta_con_producto_inactivo_o_inexistente_falla(datos_base):
    res_inactivo = client.post("/recetas/", json={
        "nombre_receta": "Receta Producto Inactivo",
        "producto_id": datos_base["producto_inactivo_id"],
        "rendimiento_estandar": 100,
    })
    assert res_inactivo.status_code == 400

    res_inexistente = client.post("/recetas/", json={
        "nombre_receta": "Receta Producto Inexistente",
        "producto_id": 999999,
        "rendimiento_estandar": 100,
    })
    assert res_inexistente.status_code == 400


def test_buscador_multicriterio_recetas(datos_base):
    # Creamos una receta con insumo y equipo
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Especial Integral",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 80,
    })
    receta_id = res_receta.json()["id"]
    codigo = res_receta.json()["codigo_receta"]

    # Agregamos paso con insumo y equipo
    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Amasado inicial",
        "instrucciones": "Mezclar ingredientes",
        "equipos": [{"equipo_id": datos_base["equipo_id"], "cantidad": 1}],
        "insumos": [{"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 10}],
    })

    # 1. Búsqueda por código
    res_busq_cod = client.get("/recetas/", params={"busqueda": codigo})
    assert res_busq_cod.status_code == 200
    assert any(r["id"] == receta_id for r in res_busq_cod.json())

    # 2. Búsqueda por nombre de receta
    res_busq_nom = client.get("/recetas/", params={"busqueda": "Especial Integral"})
    assert res_busq_nom.status_code == 200
    assert any(r["id"] == receta_id for r in res_busq_nom.json())

    # 3. Búsqueda por nombre de producto
    res_busq_prod = client.get("/recetas/", params={"busqueda": "Pan de Molde"})
    assert res_busq_prod.status_code == 200
    assert any(r["id"] == receta_id for r in res_busq_prod.json())

    # 4. Filtro por insumo_id
    res_insumo = client.get("/recetas/", params={"insumo_id": datos_base["insumo_id"]})
    assert res_insumo.status_code == 200
    assert any(r["id"] == receta_id for r in res_insumo.json())

    # 5. Filtro por equipo_id
    res_equipo = client.get("/recetas/", params={"equipo_id": datos_base["equipo_id"]})
    assert res_equipo.status_code == 200
    assert any(r["id"] == receta_id for r in res_equipo.json())

    # 6. Filtro por estado
    res_estado = client.get("/recetas/", params={"estado": "BORRADOR"})
    assert res_estado.status_code == 200
    assert any(r["id"] == receta_id for r in res_estado.json())


def test_listar_recetas_activas_filtro_y_detalle(datos_base):
    # 1. Crear y activar Receta 1
    r1 = client.post("/recetas/", json={
        "nombre_receta": "Pan Centeno Activo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 40,
    }).json()
    r1_id = r1["id"]
    client.post(f"/recetas/{r1_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Amasado de centeno",
        "instrucciones": "Amasar 15 minutos",
        "insumos": [{"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 5}],
        "equipos": [{"equipo_id": datos_base["equipo_id"], "cantidad": 1}],
    })
    res_act = client.post(f"/recetas/{r1_id}/activar")
    assert res_act.status_code == 200

    # 2. Crear Receta 2 en BORRADOR
    r2 = client.post("/recetas/", json={
        "nombre_receta": "Pan Borrador",
        "producto_id": datos_base["otro_producto_id"],
        "rendimiento_estandar": 30,
    }).json()

    # 3. Listar activas: solo debe venir r1
    res_activas = client.get("/recetas/activas")
    assert res_activas.status_code == 200
    ids_activas = [r["id"] for r in res_activas.json()]
    assert r1_id in ids_activas
    assert r2["id"] not in ids_activas

    # 4. Filtro por producto_id
    res_prod = client.get("/recetas/activas", params={"producto_id": datos_base["producto_id"]})
    assert res_prod.status_code == 200
    assert any(r["id"] == r1_id for r in res_prod.json())

    res_prod_vacio = client.get("/recetas/activas", params={"producto_id": datos_base["otro_producto_id"]})
    assert res_prod_vacio.status_code == 200
    assert not any(r["id"] == r1_id for r in res_prod_vacio.json())

    # 5. Filtro por busqueda
    res_busq = client.get("/recetas/activas", params={"busqueda": "Centeno"})
    assert res_busq.status_code == 200
    assert any(r["id"] == r1_id for r in res_busq.json())

    # 6. Detalle de receta activa: debe incluir pasos con equipos e insumos
    res_det = client.get(f"/recetas/activas/{r1_id}")
    assert res_det.status_code == 200
    data_det = res_det.json()
    assert data_det["id"] == r1_id
    assert len(data_det["pasos"]) == 1
    paso = data_det["pasos"][0]
    assert paso["titulo"] == "Amasado de centeno"
    assert len(paso["insumos"]) == 1
    assert paso["insumos"][0]["insumo"]["nombre"] is not None
    assert paso["insumos"][0]["insumo"]["unidad_medida"] is not None
    assert len(paso["equipos"]) == 1
    assert paso["equipos"][0]["equipo"]["nombre"] is not None

    # 7. Detalle de receta en borrador en /activas/{id} debe dar 404
    res_det_borrador = client.get(f"/recetas/activas/{r2['id']}")
    assert res_det_borrador.status_code == 404


def test_no_se_puede_dar_de_baja_insumo_con_receta_activa(datos_base):
    # Crear receta activa con un insumo
    res_rec = client.post("/recetas/", json={
        "nombre_receta": "Receta Bloqueo Insumo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    rec_id = res_rec.json()["id"]
    res_paso = client.post(f"/recetas/{rec_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso Insumo",
        "instrucciones": "Mezclar los insumos",
        "insumos": [{"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 10}],
        "equipos": [],
    })
    assert res_paso.status_code == 201
    res_act = client.post(f"/recetas/{rec_id}/activar")
    assert res_act.status_code == 200

    # Intentar dar de baja el insumo via DELETE
    res_del = client.delete(f"/insumos/{datos_base['insumo_id']}")
    assert res_del.status_code == 409
    assert res_del.json()["detail"] == (
        f"No se puede dar de baja el insumo '{datos_base['insumo_nombre']}' porque forma parte de la receta activa 'Receta Bloqueo Insumo'. Modificá o inhabilitá la receta antes de dar de baja el insumo."
    )

    # Intentar dar de baja el insumo via PUT (disponible=False)
    res_put = client.put(f"/insumos/{datos_base['insumo_id']}", json={"disponible": False})
    assert res_put.status_code == 409
    assert res_put.json()["detail"] == (
        f"No se puede dar de baja el insumo '{datos_base['insumo_nombre']}' porque forma parte de la receta activa 'Receta Bloqueo Insumo'. Modificá o inhabilitá la receta antes de dar de baja el insumo."
    )

    # Si inhabilitamos la receta, ahora sí debe permitir dar de baja el insumo
    client.post(f"/recetas/{rec_id}/inhabilitar")
    res_del_ok = client.delete(f"/insumos/{datos_base['insumo_id']}")
    assert res_del_ok.status_code == 200


def test_no_se_puede_dar_de_baja_equipo_con_receta_activa(datos_base):
    # Crear receta activa con un equipo
    res_rec = client.post("/recetas/", json={
        "nombre_receta": "Receta Bloqueo Equipo",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 50,
    })
    rec_id = res_rec.json()["id"]
    res_paso = client.post(f"/recetas/{rec_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso Equipo",
        "instrucciones": "Usar el equipo correspondiente",
        "insumos": [],
        "equipos": [{"equipo_id": datos_base["equipo_id"], "cantidad": 1}],
    })
    assert res_paso.status_code == 201
    res_act = client.post(f"/recetas/{rec_id}/activar")
    assert res_act.status_code == 200

    # Intentar dar de baja el equipo via DELETE
    res_del = client.delete(f"/equipos/{datos_base['equipo_id']}")
    assert res_del.status_code == 409
    assert res_del.json()["detail"] == (
        f"No se puede dar de baja el equipo '{datos_base['equipo_nombre']}' porque forma parte de la receta activa 'Receta Bloqueo Equipo'. Modificá o inhabilitá la receta antes de dar de baja el equipo."
    )

    # Intentar dar de baja el equipo via PUT con activo=False
    res_put = client.put(f"/equipos/{datos_base['equipo_id']}", json={"activo": False})
    assert res_put.status_code == 409
    assert res_put.json()["detail"] == (
        f"No se puede dar de baja el equipo '{datos_base['equipo_nombre']}' porque forma parte de la receta activa 'Receta Bloqueo Equipo'. Modificá o inhabilitá la receta antes de dar de baja el equipo."
    )

    # Si inhabilitamos la receta, ahora sí debe permitir dar de baja el equipo
    client.post(f"/recetas/{rec_id}/inhabilitar")
    res_del_ok = client.delete(f"/equipos/{datos_base['equipo_id']}")
    assert res_del_ok.status_code == 200


def test_composicion_porcentual_endpoint(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Pan Composición",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 1520,
    })
    assert res_receta.status_code == 201
    receta_id = res_receta.json()["id"]

    res_paso = client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Mezclado",
        "instrucciones": "Mezclar los insumos en la batea",
        "insumos": [
            {"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 1.0},
            {"insumo_id": datos_base["insumo_liquido_id"], "cantidad_consumo_estimada": 0.5},
            {"insumo_id": datos_base["insumo_aditivo_id"], "cantidad_consumo_estimada": 0.02},
        ],
    })
    assert res_paso.status_code == 201

    res_comp = client.get(f"/recetas/{receta_id}/composicion-porcentual")
    assert res_comp.status_code == 200, res_comp.text
    data = res_comp.json()

    assert data["es_completa"] is True
    assert len(data["insumos_sin_equivalencia"]) == 0
    assert data["peso_total_mezcla_g"] == 1520.0
    assert data["verificacion_100"] is True

    assert len(data["ingredientes"]) == 2
    assert len(data["aditivos"]) == 1

    assert data["ingredientes"][0]["nombre"] == datos_base["insumo_nombre"]
    assert data["ingredientes"][0]["porcentaje_mezcla"] == 65.79
    assert data["ingredientes"][1]["nombre"] == datos_base["insumo_liquido_nombre"]
    assert data["ingredientes"][1]["porcentaje_mezcla"] == 32.89

    assert data["aditivos"][0]["nombre"] == datos_base["insumo_aditivo_nombre"]
    assert data["aditivos"][0]["porcentaje_mezcla"] == 1.32


def test_composicion_porcentual_con_insumo_sin_equivalencia(datos_base):
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Incompleta",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 1000,
    })
    assert res_receta.status_code == 201
    receta_id = res_receta.json()["id"]

    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Mezclado",
        "instrucciones": "Mezclar con insumo sin densidad",
        "insumos": [
            {"insumo_id": datos_base["insumo_sin_equivalencia_id"], "cantidad_consumo_estimada": 0.5},
            {"insumo_id": datos_base["insumo_id"], "cantidad_consumo_estimada": 1.0},
        ],
    })

    res_comp = client.get(f"/recetas/{receta_id}/composicion-porcentual")
    assert res_comp.status_code == 200
    data = res_comp.json()

    assert data["es_completa"] is False
    assert len(data["insumos_sin_equivalencia"]) == 1
    sin_eq = data["insumos_sin_equivalencia"][0]
    assert sin_eq["insumo_id"] == datos_base["insumo_sin_equivalencia_id"]
    assert sin_eq["equivalencia_requerida"] == "Densidad (g/ml)"


def test_helpers_unitarios_composicion():
    from src.recetas.services import (
        _consolidar_insumos_receta,
        _calcular_porcentajes_y_grupos,
    )

    insumo_harina = Insumo(id=1, nombre="Harina", categoria="materia prima")
    insumo_envase = Insumo(id=2, nombre="Bolsa Plástica", categoria="envase")

    paso1 = PasoReceta(
        numero_orden=1,
        titulo="Paso 1",
        insumos=[
            PasoInsumo(insumo_id=1, insumo=insumo_harina, cantidad_consumo_estimada=300.0),
            PasoInsumo(insumo_id=2, insumo=insumo_envase, cantidad_consumo_estimada=1.0),
        ],
    )
    paso2 = PasoReceta(
        numero_orden=2,
        titulo="Paso 2",
        insumos=[
            PasoInsumo(insumo_id=1, insumo=insumo_harina, cantidad_consumo_estimada=200.0),
        ],
    )
    receta_dummy = Receta(pasos=[paso1, paso2])

    mapa = _consolidar_insumos_receta(receta_dummy)
    assert 1 in mapa
    assert 2 not in mapa
    assert mapa[1]["cantidad_nominal"] == 500.0

    items = [
        {
            "insumo_id": 10,
            "nombre": "Agua",
            "categoria": "materia prima",
            "cantidad_nominal": 200.0,
            "unidad_nominal": "g",
            "masa_equivalente_g": 200.0,
            "porcentaje_mezcla": None,
        },
        {
            "insumo_id": 11,
            "nombre": "Harina",
            "categoria": "materia prima",
            "cantidad_nominal": 800.0,
            "unidad_nominal": "g",
            "masa_equivalente_g": 800.0,
            "porcentaje_mezcla": None,
        },
        {
            "insumo_id": 12,
            "nombre": "Colorante",
            "categoria": "aditivo",
            "cantidad_nominal": 5.0,
            "unidad_nominal": "g",
            "masa_equivalente_g": 5.0,
            "porcentaje_mezcla": None,
        },
    ]

    ingredientes, aditivos, suma = _calcular_porcentajes_y_grupos(
        items_calculados=items,
        peso_total_mezcla_g=1005.0,
        es_completa=True,
    )

    assert len(ingredientes) == 2
    assert len(aditivos) == 1
    assert ingredientes[0].nombre == "Harina"
    assert ingredientes[1].nombre == "Agua"
    assert aditivos[0].nombre == "Colorante"
    assert ingredientes[0].porcentaje_mezcla == round((800.0 / 1005.0) * 100.0, 2)
    assert ingredientes[1].porcentaje_mezcla == round((200.0 / 1005.0) * 100.0, 2)
    assert aditivos[0].porcentaje_mezcla == round((5.0 / 1005.0) * 100.0, 2)
    assert abs(suma - 100.0) <= 0.1


# DECLARACIÓN DE INGREDIENTES Y ADITIVOS (RÓTULO CAA)

def test_declaracion_ingredientes_automatico_y_formato_caa(datos_base, insumos_caa):
    harina = insumos_caa["harina"]
    agua = insumos_caa["agua"]
    azucar = insumos_caa["azucar"]
    conservante = insumos_caa["conservante"]
    aromatizante = insumos_caa["aromatizante"]

    # Crear receta
    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Pan Dulce Especial",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 1000,
    })
    receta_id = res_receta.json()["id"]

    # Agregar paso con todos los insumos (cantidades en kg, total = 0.6 + 0.2 + 0.2 + 0.01 + 0.005 = 1.015 kg)
    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Mezcla general",
        "instrucciones": "Integrar todos los ingredientes",
        "insumos": [
            {"insumo_id": aromatizante.id, "cantidad_consumo_estimada": 0.005},
            {"insumo_id": conservante.id, "cantidad_consumo_estimada": 0.01},
            {"insumo_id": azucar.id, "cantidad_consumo_estimada": 0.2},
            {"insumo_id": agua.id, "cantidad_consumo_estimada": 0.2},
            {"insumo_id": harina.id, "cantidad_consumo_estimada": 0.6},
        ],
    })

    # Consultar declaración de ingredientes
    res_dec = client.get(f"/recetas/{receta_id}/declaracion-ingredientes")
    assert res_dec.status_code == 200
    data = res_dec.json()

    assert data["es_orden_manual"] is False
    assert data["es_completa"] is True
    items = data["items"]
    assert len(items) == 5

    # Verificación de orden:
    # 1° Harina (600g ~ 59.11%)
    assert items[0]["insumo_id"] == harina.id
    assert items[0]["denominacion_rotulo"] == "Harina de trigo enriquecida"
    assert items[0]["categoria"] == "materia prima"

    # 2° y 3° Empatados (200g ~ 19.70%): "Agua" va antes que "Azúcar común tipo A" por desempate alfabético
    assert items[1]["insumo_id"] == agua.id
    assert items[1]["denominacion_rotulo"] == "Agua"

    assert items[2]["insumo_id"] == azucar.id
    assert items[2]["denominacion_rotulo"] == "Azúcar común tipo A"

    # 4° y 5° Aditivos al final, agrupados por clase funcional (Aromatizante, Conservante):
    # Aromatizante sin INS: declara solo su función o denominación
    aditivos_items = [it for it in items if it["categoria"] == "aditivo"]
    assert len(aditivos_items) == 2
    
    # Verificar formato legal de aditivo con INS: "Conservante: Propionato de calcio (INS 282)"
    item_cons = next(it for it in aditivos_items if it["insumo_id"] == conservante.id)
    assert "Conservante: Propionato de calcio (INS 282)" in item_cons["texto_declaracion"]

    # Verificar formato legal de aromatizante sin INS: "Aromatizante/Saborizante"
    item_aroma = next(it for it in aditivos_items if it["insumo_id"] == aromatizante.id)
    assert "aromatizante" in item_aroma["texto_declaracion"].lower()

    # Verificar texto legal general con punto separando materias primas y aditivos
    assert data["texto_legal_rotulo"].startswith("Ingredientes: ")
    assert "Harina de trigo enriquecida" in data["texto_legal_rotulo"]
    assert "INS 282" in data["texto_legal_rotulo"]
    assert "Azúcar común tipo A. " in data["texto_legal_rotulo"]


def test_orden_manual_y_restablecer(datos_base, insumos_caa):
    i1 = insumos_caa["harina"]
    i2 = insumos_caa["agua"]
    i3 = insumos_caa["azucar"]
    ad1 = insumos_caa["conservante"]
    ad2 = insumos_caa["leudante_1"]

    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Reordenamiento Estricto",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 100,
    })
    receta_id = res_receta.json()["id"]

    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso 1",
        "instrucciones": "Paso 1",
        "insumos": [
            {"insumo_id": i1.id, "cantidad_consumo_estimada": 0.5},
            {"insumo_id": i2.id, "cantidad_consumo_estimada": 0.2},
            {"insumo_id": i3.id, "cantidad_consumo_estimada": 0.2},
            {"insumo_id": ad1.id, "cantidad_consumo_estimada": 0.005},
            {"insumo_id": ad2.id, "cantidad_consumo_estimada": 0.005},
        ],
    })

    # 1. Regla Materias Primas: Intentar colocar i3 (0.2) antes de i1 (0.5) debe fallar (400 Bad Request)
    res_fail_pct = client.put(
        f"/recetas/{receta_id}/declaracion-ingredientes/orden-manual",
        json={"insumo_ids_ordenados": [i3.id, i1.id, i2.id, ad2.id, ad1.id]},
    )
    assert res_fail_pct.status_code == 400
    assert "estrictamente decreciente por porcentaje" in res_fail_pct.json()["detail"].lower()

    # 2. Regla Frontera: Intentar colocar un aditivo antes de una materia prima debe fallar (400 Bad Request)
    res_fail_frontera = client.put(
        f"/recetas/{receta_id}/declaracion-ingredientes/orden-manual",
        json={"insumo_ids_ordenados": [i1.id, ad1.id, i2.id, i3.id, ad2.id]},
    )
    assert res_fail_frontera.status_code == 400
    assert "no puede preceder a una materia prima" in res_fail_frontera.json()["detail"].lower()

    # 3. Reordenamiento válido:
    # - Materias primas: reordenar i2 e i3 (tienen exactamente el mismo porcentaje 0.2): [i1, i3, i2]
    # - Aditivos: mover bloque Leudante (ad2) antes de bloque Conservante (ad1): [ad2, ad1]
    orden_valido = [i1.id, i3.id, i2.id, ad2.id, ad1.id]
    res_ok = client.put(
        f"/recetas/{receta_id}/declaracion-ingredientes/orden-manual",
        json={"insumo_ids_ordenados": orden_valido},
    )
    assert res_ok.status_code == 200
    data_ok = res_ok.json()
    assert data_ok["es_orden_manual"] is True
    assert [it["insumo_id"] for it in data_ok["items"]] == orden_valido

    # 4. Restablecer orden automático con DELETE
    res_del = client.delete(f"/recetas/{receta_id}/declaracion-ingredientes/orden-manual")
    assert res_del.status_code == 200
    data_del = res_del.json()
    assert data_del["es_orden_manual"] is False
    # En orden automático, el desempate alfabético ubica "Agua Empatada" (i2) antes de "Azúcar Empatada" (i3)
    assert data_del["items"][0]["insumo_id"] == i1.id
    assert data_del["items"][1]["insumo_id"] == i2.id
    assert data_del["items"][2]["insumo_id"] == i3.id


def test_aditivos_agrupados_por_clase_en_texto_legal_y_rechazo_fragmentacion(datos_base, insumos_caa):
    harina = insumos_caa["harina"]
    leu1 = insumos_caa["leudante_1"]
    leu2 = insumos_caa["leudante_2"]
    cons = insumos_caa["conservante"]

    res_receta = client.post("/recetas/", json={
        "nombre_receta": "Receta Aditivos Multiples",
        "producto_id": datos_base["producto_id"],
        "rendimiento_estandar": 100,
    })
    receta_id = res_receta.json()["id"]

    client.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso 1",
        "instrucciones": "Paso 1",
        "insumos": [
            {"insumo_id": harina.id, "cantidad_consumo_estimada": 0.9},
            {"insumo_id": leu1.id, "cantidad_consumo_estimada": 0.005},
            {"insumo_id": leu2.id, "cantidad_consumo_estimada": 0.005},
            {"insumo_id": cons.id, "cantidad_consumo_estimada": 0.002},
        ],
    })

    # Verificar emisión conjunta de aditivos de la misma clase:
    # "Leudante químico: Bicarbonato de sodio (INS 500ii), Pirofosfato ácido de sodio (INS 450i)"
    res_dec = client.get(f"/recetas/{receta_id}/declaracion-ingredientes")
    assert res_dec.status_code == 200
    texto_legal = res_dec.json()["texto_legal_rotulo"]
    assert "Leudante químico: Bicarbonato de sodio (INS 500ii), Pirofosfato ácido de sodio (INS 450i)" in texto_legal or \
           "Leudante químico: Pirofosfato ácido de sodio (INS 450i), Bicarbonato de sodio (INS 500ii)" in texto_legal
    assert "Conservante: Propionato de calcio (INS 282)" in texto_legal

    # Fragmentar la clase funcional "Leudante químico" intercalando "Conservante":
    # [harina, leu1, cons, leu2] -> debe fallar con 400
    res_frag = client.put(
        f"/recetas/{receta_id}/declaracion-ingredientes/orden-manual",
        json={"insumo_ids_ordenados": [harina.id, leu1.id, cons.id, leu2.id]},
    )
    assert res_frag.status_code == 400
    assert "fragmentada" in res_frag.json()["detail"].lower()




