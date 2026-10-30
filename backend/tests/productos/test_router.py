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

def test_dar_alta_producto():
    unidad_id = crear_unidad_medida_auxiliar()
    producto_id = crear_producto_auxiliar(unidad_id)

    res_del_prod = cli.delete(f"/productos/{producto_id}")
    assert res_del_prod.status_code == 200

    res_put = cli.put(
        f"/productos/{producto_id}",
        json={"activo": True},
    )
    assert res_put.status_code == 200
    assert res_put.json()["activo"] is True

def test_listar_productos():
    unidad_id = crear_unidad_medida_auxiliar()
    crear_producto_auxiliar(unidad_id)

    res = cli.get("/productos/")
    assert res.status_code == 200
    assert len(res.json()) > 0

def test_listar_sin_productos():
    res = cli.get("/productos/")
    assert res.status_code == 200
    assert len(res.json()) == 0

def test_listar_productos_con_filtros():
    unidad_id = crear_unidad_medida_auxiliar()
    otra_unidad = cli.post(
        "/unidades-de-medida/",
        json={
            "nombre": "Otra unidad de prueba",
            "simbolo": "g",
            "tipo_magnitud": "masa",
        },
    )
    assert otra_unidad.status_code == 201, otra_unidad.text
    otra_unidad_id = otra_unidad.json()["id"]

    producto_activo = cli.post(
        "/productos/",
        json={
            "nombre": "Pan de prueba",
            "descripcion": "Producto activo",
            "unidad_medida_id": unidad_id,
        },
    )
    producto_otra_unidad = cli.post(
        "/productos/",
        json={
            "nombre": "Galleta de prueba",
            "descripcion": "Producto de otra unidad",
            "unidad_medida_id": otra_unidad_id,
        },
    )
    producto_inactivo = cli.post(
        "/productos/",
        json={
            "nombre": "Pan inactivo",
            "descripcion": "Producto dado de baja",
            "unidad_medida_id": unidad_id,
        },
    )
    assert producto_activo.status_code == 201, producto_activo.text
    assert producto_otra_unidad.status_code == 201, producto_otra_unidad.text
    assert producto_inactivo.status_code == 201, producto_inactivo.text
    baja = cli.delete(f"/productos/{producto_inactivo.json()['id']}")
    assert baja.status_code == 200, baja.text

    por_nombre = cli.get("/productos/", params={"busqueda": "Pan"})
    assert por_nombre.status_code == 200, por_nombre.text
    assert {producto["nombre"] for producto in por_nombre.json()} == {
        "Pan de prueba",
        "Pan inactivo",
    }

    por_unidad = cli.get(
        "/productos/",
        params={"unidad_de_medida_id": unidad_id},
    )
    assert por_unidad.status_code == 200, por_unidad.text
    assert {producto["nombre"] for producto in por_unidad.json()} == {
        "Pan de prueba",
        "Pan inactivo",
    }

    activos = cli.get("/productos/", params={"estado": "true"})
    assert activos.status_code == 200, activos.text
    assert {producto["nombre"] for producto in activos.json()} == {
        "Pan de prueba",
        "Galleta de prueba",
    }

    inactivos = cli.get("/productos/", params={"estado": "false"})
    assert inactivos.status_code == 200, inactivos.text
    assert [producto["nombre"] for producto in inactivos.json()] == ["Pan inactivo"]

def test_leer_un_producto():
    unidad_id = crear_unidad_medida_auxiliar()
    producto_id = crear_producto_auxiliar(unidad_id)

    res = cli.get(f"/productos/{producto_id}")
    assert res.status_code == 200

    prod = res.json()
    assert prod["id"] == producto_id

def test_leer_producto_inexistente():

    res = cli.get(f"/productos/{999}")
    assert res.status_code == 404

def test_modificar_producto():
    unidad_id = crear_unidad_medida_auxiliar()
    prod_id = crear_producto_auxiliar(unidad_id)

    res = cli.put(
        f"/productos/{prod_id}",
        json={
            "nombre": "Producto modificado"
        }
    )
    assert res.status_code == 200

def test_modificar_producto_inexistente():
    res = cli.put(
        f"/productos/{999}",
        json={
            "nombre": "Producto inexistente"
        }
    )
    assert res.status_code == 404

def test_modificar_producto_vaciando_datos():
    unidad_id = crear_unidad_medida_auxiliar()
    prod_id = crear_producto_auxiliar(unidad_id)

    res = cli.put(
        f"/productos/{prod_id}",
        json={
            "nombre": None,
        }
    )
    assert res.status_code == 422


def test_eliminar_producto_con_receta_activa_falla():
    unidad_id = crear_unidad_medida_auxiliar()
    prod_id = crear_producto_auxiliar(unidad_id)

    # Creamos receta para este producto y la activamos
    res_receta = cli.post("/recetas/", json={
        "nombre_receta": "Receta Bloqueante",
        "producto_id": prod_id,
        "rendimiento_estandar": 50,
    })
    receta_id = res_receta.json()["id"]

    # Agregar paso para poder activarla
    cli.post(f"/recetas/{receta_id}/pasos", json={
        "numero_orden": 1,
        "titulo": "Paso 1",
        "instrucciones": "Hacer paso",
    })
    res_act = cli.post(f"/recetas/{receta_id}/activar")
    assert res_act.status_code == 200

    # Intentar eliminar producto con receta activa -> 409 Conflict
    res_del = cli.delete(f"/productos/{prod_id}")
    assert res_del.status_code == 409
    assert res_del.json()["detail"] == "No se puede dar de baja el producto porque tiene una o más recetas activas asociadas."


def test_filtrar_productos_por_parametro_activo():
    unidad_id = crear_unidad_medida_auxiliar()
    prod_id = crear_producto_auxiliar(unidad_id)

    # Filtrar activo=true
    res_activos = cli.get("/productos/", params={"activo": "true"})
    assert res_activos.status_code == 200
    assert any(p["id"] == prod_id for p in res_activos.json())

    # Damos de baja (no tiene recetas activas)
    cli.delete(f"/productos/{prod_id}")

    # Filtrar activo=false
    res_inactivos = cli.get("/productos/", params={"activo": "false"})
    assert res_inactivos.status_code == 200
    assert any(p["id"] == prod_id for p in res_inactivos.json())
