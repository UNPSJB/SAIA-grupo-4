from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

cli = TestClient(app)

def crear_unidad_medida_auxiliar() -> int:
    res = cli.post(
        "/unidades-de-medida/",
        json={
            "nombre": "Unidad de prueba",
            "simbolo": "L",
            "tipo_magnitud": "volumen"
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]

def crear_producto_auxiliar (unidad_id: int) -> int:
    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]

def test_crear_producto():
    unidad_id = crear_unidad_medida_auxiliar()
    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )

    assert res.status_code == 201
    data = res.json()
    assert data["nombre"] == "Producto de prueba"

def test_crear_producto_duplicado():
    unidad_id = crear_unidad_medida_auxiliar()
    res_post = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )

    assert res_post.status_code == 201

    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )

    assert res.status_code == 400

def test_crear_producto_duplicado_inactivo():
    unidad_id = crear_unidad_medida_auxiliar()
    res_post = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )
    prod_id = res_post.json()["id"]

    res_del = cli.delete(f"/productos/{prod_id}")
    assert res_del.status_code == 200

    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )

    assert res.status_code == 409
    data = res.json()
    assert data["detail"]["producto_id"] == prod_id
    assert "code" in data["detail"]
    assert res.headers.get("X-Producto-Id") == str(prod_id)

def test_crear_producto_sin_unidad_medida():
    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
        },
    )

    assert res.status_code == 422

def test_crear_producto_con_unidad_inexistente():
    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": 999,
        },
    )
    assert res.status_code == 404

def test_crear_producto_con_unidad_inactiva():
    unidad_id = crear_unidad_medida_auxiliar()

    res_del = cli.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 200

    res = cli.post(
        "/productos/",
        json={
            "nombre": "Producto de prueba",
            "descripcion": "Descripcion de prueba",
            "unidad_medida_id": unidad_id,
        },
    )

    assert res.status_code == 400

def test_dar_alta_producto_con_unidad_inactiva():
    unidad_id = crear_unidad_medida_auxiliar()
    producto_id = crear_producto_auxiliar(unidad_id)

    res_del_prod = cli.delete(f"/productos/{producto_id}")
    assert res_del_prod.status_code == 200

    res_del_uni = cli.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del_uni.status_code == 200

    res_put = cli.put(
        f"/productos/{producto_id}",
        json={"activo": True},
    )
    assert res_put.status_code == 400
    assert res_put.json()["detail"] == "La unidad de medida asociada se encuentra dada de baja. Debe reactivarse la unidad de medida primero"