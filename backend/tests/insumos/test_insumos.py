from fastapi.testclient import TestClient
from src.main import app
from tests.database import session
import uuid

client = TestClient(app)


def crear_unidad_medida(nombre: str = "Kilogramo", simbolo: str = "kg", tipo: str = "masa") -> int:
    res = client.post(
        "/unidades-de-medida/",
        json={"nombre": nombre, "simbolo": simbolo, "tipo_magnitud": tipo},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_crear_insumo():
    unidad_id = crear_unidad_medida()
    response = client.post(
        "/insumos/",
        json={
            "nombre": "Harina 0000",
            "unidad_medida_id": unidad_id,
            "categoria": "materia prima",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Harina 0000"
    assert data["unidad_medida_id"] == unidad_id
    assert data["unidad_medida"]["nombre"] == "Kilogramo"
    assert data["categoria"] == "materia prima"
    assert data["disponible"] is True
    assert "id" in data


def test_crear_insumo_duplicado_activo():
    cliente = client
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    cliente.post(
        "/insumos/",
        json={
            "nombre": "Levadura",
            "unidad_medida_id": unidad_id,
            "categoria": "materia prima",
        },
    )

    response = cliente.post(
        "/insumos/",
        json={
            "nombre": "Levadura",
            "unidad_medida_id": unidad_id,
            "categoria": "materia prima",
        },
    )

    assert response.status_code == 400


def test_crear_insumo_duplicado_inactivo():
    # Creamos un insumo y lo damos de baja (baja logica)
    cliente = client
    unidad_id = crear_unidad_medida(nombre="Azucar")
    res_post = cliente.post(
        "/insumos/",
        json={
            "nombre": "Azúcar",
            "unidad_medida_id": unidad_id,
            "categoria": "materia prima",
        },
    )
    insumo_id = res_post.json()["id"]
    res_del = cliente.delete(f"/insumos/{insumo_id}")
    assert res_del.status_code == 200

    # Intentamos crear otro insumo con el mismo nombre
    response = cliente.post(
        "/insumos/",
        json={
            "nombre": "Azúcar",
            "unidad_medida_id": unidad_id,
            "categoria": "materia prima",
        },
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["insumo_id"] == insumo_id
    assert "code" in data["detail"]
    assert response.headers.get("X-Insumo-Id") == str(insumo_id)


def test_crear_insumo_categoria_invalida():
    unidad_id = crear_unidad_medida(nombre="Gramo")
    response = client.post(
        "/insumos/",
        json={"nombre": "Sal", "unidad_medida_id": unidad_id, "categoria": "vehiculo"},
    )
    assert response.status_code == 422


def test_crear_insumo_unidad_inexistente():
    response = client.post(
        "/insumos/",
        json={"nombre": "Sal", "unidad_medida_id": 9999, "categoria": "materia prima"},
    )
    assert response.status_code == 400


def test_crear_insumo_con_unidad_inactiva():
    unidad_id = crear_unidad_medida(nombre="Bolsas", tipo="cantidad")
    res_del = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 200

    response = client.post(
        "/insumos/",
        json={
            "nombre": "Bolsa",
            "unidad_medida_id": unidad_id,
            "categoria": "envase",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "La unidad de medida asociada se encuentra dada de baja. Debe reactivarse la unidad de medida primero"


def test_dar_alta_insumo_con_unidad_inactiva():
    unidad_id = crear_unidad_medida(nombre="Tarro", tipo="cantidad")
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Tapa de tarro",
            "unidad_medida_id": unidad_id,
            "categoria": "envase",
        },
    )
    insumo_id = res_post.json()["id"]
    res_del_insumo = client.delete(f"/insumos/{insumo_id}")
    assert res_del_insumo.status_code == 200

    res_del_unidad = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del_unidad.status_code == 200

    res_put = client.put(
        f"/insumos/{insumo_id}",
        json={"disponible": True},
    )
    assert res_put.status_code == 400
    assert res_put.json()["detail"] == "La unidad de medida asociada se encuentra dada de baja. Debe reactivarse la unidad de medida primero"


def test_dar_alta_insumo_con_unidad_activa():
    unidad_id = crear_unidad_medida(nombre="Botella", tipo="cantidad")
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Botella 500ml",
            "unidad_medida_id": unidad_id,
            "categoria": "envase",
        },
    )
    insumo_id = res_post.json()["id"]
    res_del = client.delete(f"/insumos/{insumo_id}")
    assert res_del.status_code == 200

    res_put = client.put(
        f"/insumos/{insumo_id}",
        json={"disponible": True},
    )
    assert res_put.status_code == 200
    assert res_put.json()["disponible"] is True


def test_listar_insumos():
    response = client.get("/insumos/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_obtener_insumo_por_id():
    unidad_id = crear_unidad_medida(nombre="Litro", simbolo="L", tipo="volumen")
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Aceite",
            "unidad_medida_id": unidad_id,
            "categoria": "aditivo",
        },
    )
    insumo_id = res_post.json()["id"]

    res_get = client.post(f"/insumos/{insumo_id}")
    assert res_get.status_code == 200
    assert res_get.json()["nombre"] == "Aceite"
    assert res_get.json()["unidad_medida"]["nombre"] == "Litro"


def test_obtener_insumo_inexistente():
    response = client.post("/insumos/9999")
    assert response.status_code == 404


def test_actualizar_insumo():
    unidad_id = crear_unidad_medida(nombre="Unidad", simbolo="u", tipo="cantidad")
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Envase 500ml",
            "unidad_medida_id": unidad_id,
            "categoria": "envase",
        },
    )
    insumo_id = res_post.json()["id"]

    res_put = client.put(
        f"/insumos/{insumo_id}",
        json={"nombre": "Envase 1L"},
    )
    assert res_put.status_code == 200
    assert res_put.json()["nombre"] == "Envase 1L"


def test_eliminar_insumo():
    unidad_id = crear_unidad_medida(nombre="Unidad", simbolo="u", tipo="cantidad")
    res_post = client.post(
        "/insumos/",
        json={
            "nombre": "Caja de cartón",
            "unidad_medida_id": unidad_id,
            "categoria": "envase",
        },
    )
    insumo_id = res_post.json()["id"]

    res_del = client.delete(f"/insumos/{insumo_id}")
    assert res_del.status_code == 200
    assert res_del.json()["disponible"] is False


# --- Búsqueda de texto libre ---

def sufijo_unico():
    return uuid.uuid4().hex[:8]


def crear_insumo_con_nombre(nombre, categoria="materia prima"):
    res = client.post(
        "/insumos/",
        json={
            "nombre": nombre,
            "unidad_medida_id": crear_unidad_medida(),
            "categoria": categoria,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def ids_buscados(**params):
    res = client.get("/insumos/", params=params)
    assert res.status_code == 200, res.text
    return {i["id"] for i in res.json()}


def test_busqueda_parcial_sin_mayusculas_ni_acentos():
    sufijo = sufijo_unico()
    insumo = crear_insumo_con_nombre(f"Azúcar Impalpable {sufijo}")

    for texto in [f"azucar impalpable {sufijo}", f"AZÚCAR IMPALPABLE {sufijo.upper()}", f"palpable {sufijo}"]:
        assert insumo["id"] in ids_buscados(busqueda=texto)


def test_busqueda_por_categoria():
    insumo = crear_insumo_con_nombre(f"Levadura {sufijo_unico()}")

    assert insumo["id"] in ids_buscados(busqueda="materia prima")


def test_busqueda_por_unidad_de_medida():
    insumo = crear_insumo_con_nombre(f"Sal {sufijo_unico()}")

    assert insumo["id"] in ids_buscados(busqueda="kilogramo")


def test_busqueda_excluye_los_que_no_coinciden():
    sufijo = sufijo_unico()
    coincide = crear_insumo_con_nombre(f"Harina {sufijo}")
    no_coincide = crear_insumo_con_nombre(f"Aceite {sufijo_unico()}")

    resultado = ids_buscados(busqueda=f"harina {sufijo}")
    assert coincide["id"] in resultado
    assert no_coincide["id"] not in resultado


def test_busqueda_sin_resultados():
    crear_insumo_con_nombre(f"Manteca {sufijo_unico()}")

    assert ids_buscados(busqueda=f"zzz{sufijo_unico()}") == set()


def test_busqueda_no_interpreta_comodines():
    insumo = crear_insumo_con_nombre(f"Cacao{sufijo_unico()}")

    # Si "%" fuera comodín, devolvería todo el listado
    assert insumo["id"] not in ids_buscados(busqueda="%")


def test_busqueda_incluye_insumos_no_disponibles():
    # El listado devuelve disponibles y no disponibles, y la búsqueda no cambia eso
    sufijo = sufijo_unico()
    insumo = crear_insumo_con_nombre(f"Vainilla {sufijo}")
    assert client.delete(f"/insumos/{insumo['id']}").status_code == 200

    assert insumo["id"] in ids_buscados(busqueda=f"vainilla {sufijo}")


def crear_insumo_con_nombre(nombre, categoria="materia prima", unidad_id=None):
    res = client.post(
        "/insumos/",
        json={
            "nombre": nombre,
            "unidad_medida_id": unidad_id or crear_unidad_medida(),
            "categoria": categoria,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_busqueda_excluye_los_que_no_coinciden():
    sufijo = sufijo_unico()
    unidad_id = crear_unidad_medida()
    coincide = crear_insumo_con_nombre(f"Harina {sufijo}", unidad_id=unidad_id)
    no_coincide = crear_insumo_con_nombre(f"Aceite {sufijo_unico()}", unidad_id=unidad_id)

    resultado = ids_buscados(busqueda=f"harina {sufijo}")
    assert coincide["id"] in resultado
    assert no_coincide["id"] not in resultado


def test_busqueda_por_simbolo_de_unidad():
    insumo = crear_insumo_con_nombre(f"Pimienta {sufijo_unico()}")

    assert insumo["id"] in ids_buscados(busqueda="kg")