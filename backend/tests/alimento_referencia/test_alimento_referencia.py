from fastapi.testclient import TestClient
from src.alimento_referencia.services import sembrar_alimentos_sara
from src.main import app
from tests.database import session

client = TestClient(app)


def test_sembrar_sara_y_busqueda_paginada(session):
    cantidad_insertada = sembrar_alimentos_sara(session)
    assert cantidad_insertada == 379

    # Idempotente: segunda llamada no duplica
    assert sembrar_alimentos_sara(session) == 0

    # Búsqueda sin tildes contra texto con/sin tildes
    res = client.get("/alimentos-referencia/?q=almidon&page=1&limit=20")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert any(item["codigo"] == "A001" for item in items)
    almidon = next(item for item in items if item["codigo"] == "A001")
    assert almidon["es_oficial_sara"] is True
    assert almidon["categoria"] == "Cereales, legumbres y derivados"

    # Paginación limit=5
    res_p1 = client.get("/alimentos-referencia/?page=1&limit=5")
    res_p2 = client.get("/alimentos-referencia/?page=2&limit=5")
    assert res_p1.status_code == 200 and res_p2.status_code == 200
    assert len(res_p1.json()) == 5
    assert len(res_p2.json()) == 5
    assert {x["id"] for x in res_p1.json()}.isdisjoint({x["id"] for x in res_p2.json()})


def test_proteccion_alimento_oficial_sara_y_crud_propio(session):
    sembrar_alimentos_sara(session)
    res_sara = client.get("/alimentos-referencia/?q=A001&limit=5")
    sara_id = res_sara.json()[0]["id"]

    # No se puede eliminar ni modificar un alimento oficial SARA 2
    res_del_sara = client.delete(f"/alimentos-referencia/{sara_id}")
    assert res_del_sara.status_code == 400

    res_put_sara = client.put(
        f"/alimentos-referencia/{sara_id}",
        json={"alimento": "Alterado"},
    )
    assert res_put_sara.status_code == 400

    # Alta manual de alimento propio
    res_crear = client.post(
        "/alimentos-referencia/",
        json={
            "alimento": "Premezcla Panadera Especial",
            "categoria": "Cereales, legumbres y derivados",
            "energia_kcal": "350.00",
            "proteinas_g": "11.50",
            "grasas_totales_g": "3.20",
            "carbohidratos_g": "68.00",
            "fibra_g": "4.10",
            "sodio_mg": "450.00",
            "grasas_saturadas_g": "0.80",
        },
    )
    assert res_crear.status_code == 201, res_crear.text
    propio = res_crear.json()
    assert propio["es_oficial_sara"] is False
    assert propio["energia_kcal"] == "350.00"

    # Detalle por ID
    res_get = client.get(f"/alimentos-referencia/{propio['id']}")
    assert res_get.status_code == 200
    assert res_get.json()["alimento"] == "Premezcla Panadera Especial"

    # Eliminación de alimento propio permitida
    res_del_propio = client.delete(f"/alimentos-referencia/{propio['id']}")
    assert res_del_propio.status_code == 200
    assert client.get(f"/alimentos-referencia/{propio['id']}").status_code == 404


def test_validaciones_swagger_alimento_referencia(session):
    # Nombre solo espacios rechazado
    res_vacio = client.post(
        "/alimentos-referencia/",
        json={"alimento": "   ", "energia_kcal": "10.00"},
    )
    assert res_vacio.status_code == 422

    # Campo extra / protegido rechazado
    res_extra = client.post(
        "/alimentos-referencia/",
        json={"alimento": "Alimento Test", "es_oficial_sara": True},
    )
    assert res_extra.status_code == 422

    # Crear propio válido para probar PUT con null o extra
    res_crear = client.post(
        "/alimentos-referencia/",
        json={"alimento": "Alimento Propio Validacion"},
    )
    assert res_crear.status_code == 201
    propio_id = res_crear.json()["id"]

    res_put_null = client.put(
        f"/alimentos-referencia/{propio_id}",
        json={"energia_kcal": None},
    )
    assert res_put_null.status_code == 422

    res_put_extra = client.put(
        f"/alimentos-referencia/{propio_id}",
        json={"es_oficial_sara": True},
    )
    assert res_put_extra.status_code == 422
