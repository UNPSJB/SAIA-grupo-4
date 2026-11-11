from fastapi.testclient import TestClient
from src.main import app
from tests.database import session
from src.unidad_medida.models import UnidadMedida
from src.unidad_medida.services import convertir_a_gramos

client = TestClient(app)


def crear_insumo(nombre: str, unidad_medida_id: int, categoria: str = "materia prima") -> int:
    res = client.post(
        "/insumos/",
        json={"nombre": nombre, "unidad_medida_id": unidad_medida_id, "categoria": categoria},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_crear_unidad_medida():
    response = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Kilogramo", "simbolo": "kg", "tipo_magnitud": "masa"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Kilogramo"
    assert data["simbolo"] == "kg"
    assert data["tipo_magnitud"] == "masa"
    assert data["disponible"] is True
    assert "id" in data


def test_crear_unidad_medida_duplicada_activa():
    client.post(
        "/unidades-de-medida/",
        json={"nombre": "Litro", "simbolo": "L", "tipo_magnitud": "volumen"},
    )

    response = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Litro", "simbolo": "L", "tipo_magnitud": "volumen"},
    )

    assert response.status_code == 400


def test_crear_unidad_medida_duplicada_inactiva():
    res_post = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Gramo", "simbolo": "g", "tipo_magnitud": "masa"},
    )
    unidad_id = res_post.json()["id"]
    res_del = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 200

    response = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Gramo", "simbolo": "g", "tipo_magnitud": "masa"},
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["unidad_medida_id"] == unidad_id
    assert "code" in data["detail"]
    assert response.headers.get("X-Unidad-Medida-Id") == str(unidad_id)


def test_crear_unidad_medida_magnitud_invalida():
    response = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Centimetro", "simbolo": "cm", "tipo_magnitud": "longitud_invalida"},
    )
    assert response.status_code == 422


def test_listar_unidades_de_medida():
    response = client.get("/unidades-de-medida/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_obtener_unidad_medida_por_id():
    res_post = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Litro", "simbolo": "L", "tipo_magnitud": "volumen"},
    )
    unidad_id = res_post.json()["id"]

    res_get = client.get(f"/unidades-de-medida/{unidad_id}")
    assert res_get.status_code == 200
    assert res_get.json()["nombre"] == "Litro"


def test_obtener_unidad_medida_inexistente():
    response = client.get("/unidades-de-medida/9999")
    assert response.status_code == 404


def test_actualizar_unidad_medida():
    res_post = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Litro", "simbolo": "L", "tipo_magnitud": "volumen"},
    )
    unidad_id = res_post.json()["id"]

    res_put = client.put(
        f"/unidades-de-medida/{unidad_id}",
        json={"nombre": "Kilolitro", "simbolo": "kL", "tipo_magnitud": "volumen"},
    )
    assert res_put.status_code == 200
    assert res_put.json()["nombre"] == "Kilolitro"
    assert res_put.json()["simbolo"] == "kL"


def test_eliminar_unidad_medida():
    res_post = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Mililitro", "simbolo": "mL", "tipo_magnitud": "volumen"},
    )
    unidad_id = res_post.json()["id"]

    res_del = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 200
    assert res_del.json()["disponible"] is False


def test_eliminar_unidad_medida_con_insumo_activo():
    res_unidad = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Kilogramo", "simbolo": "kg", "tipo_magnitud": "masa"},
    )
    unidad_id = res_unidad.json()["id"]

    crear_insumo("Harina", unidad_id)

    res_del = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 409
    assert res_del.json()["detail"] == "No se puede eliminar una unidad de medida asociada a un insumo activo"


def test_eliminar_unidad_medida_con_insumo_dado_de_baja():
    res_unidad = client.post(
        "/unidades-de-medida/",
        json={"nombre": "Gramo", "simbolo": "g", "tipo_magnitud": "masa"},
    )
    unidad_id = res_unidad.json()["id"]

    insumo_id = crear_insumo("Sal", unidad_id)
    res_del_insumo = client.delete(f"/insumos/{insumo_id}")
    assert res_del_insumo.status_code == 200

    res_del = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 200
    assert res_del.json()["disponible"] is False


def test_convertir_a_gramos_masa():
    um_kg = UnidadMedida(nombre="Kilogramo", simbolo="kg", tipo_magnitud="masa")
    um_g = UnidadMedida(nombre="Gramo", simbolo="g", tipo_magnitud="masa")
    um_mg = UnidadMedida(nombre="Miligramo", simbolo="mg", tipo_magnitud="masa")
    um_desconocida = UnidadMedida(nombre="Pizca", simbolo="pzc", tipo_magnitud="masa")

    assert convertir_a_gramos(2.5, um_kg) == 2500.0
    assert convertir_a_gramos(500, um_g) == 500.0
    assert convertir_a_gramos(1000, um_mg) == 1.0
    # Unidad desconocida retorna None en lugar de inventar un factor
    assert convertir_a_gramos(5, um_desconocida) is None


def test_convertir_a_gramos_volumen():
    um_l = UnidadMedida(nombre="Litro", simbolo="L", tipo_magnitud="volumen")
    um_ml = UnidadMedida(nombre="Mililitro", simbolo="ml", tipo_magnitud="volumen")
    um_desconocida = UnidadMedida(nombre="Balde", simbolo="bld", tipo_magnitud="volumen")

    # Sin densidad retorna None
    assert convertir_a_gramos(1.5, um_l, densidad_g_ml=None) is None
    assert convertir_a_gramos(250, um_ml, densidad_g_ml=0) is None

    # Con densidad (ej. agua / leche / aceite)
    assert convertir_a_gramos(1.0, um_l, densidad_g_ml=1.0) == 1000.0
    assert convertir_a_gramos(500, um_ml, densidad_g_ml=0.92) == 460.0
    # Unidad de volumen no registrada retorna None
    assert convertir_a_gramos(1.0, um_desconocida, densidad_g_ml=1.0) is None


def test_convertir_a_gramos_cantidad():
    um_u = UnidadMedida(nombre="Unidad", simbolo="u", tipo_magnitud="cantidad")
    um_doc = UnidadMedida(nombre="Docena", simbolo="doc", tipo_magnitud="cantidad")

    # Sin peso unitario retorna None
    assert convertir_a_gramos(2, um_u, peso_unitario_g=None) is None

    # Con peso unitario (ej. huevos 50g c/u)
    assert convertir_a_gramos(3, um_u, peso_unitario_g=50.0) == 150.0
    assert convertir_a_gramos(1, um_doc, peso_unitario_g=50.0) == 600.0
