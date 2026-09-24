from fastapi.testclient import TestClient
from src.main import app
from tests.database import session

client = TestClient(app)


def crear_unidad_medida(nombre: str = "Kilogramo", simbolo: str = "kg", tipo: str = "masa") -> int:
    res = client.post(
        "/unidades-de-medida/",
        json={"nombre": nombre, "simbolo": simbolo, "tipo_magnitud": tipo},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]

def crear_sector(nombre: str = "Algo") -> int:
    res = client.post(
        "/sectores/",
        json={"nombre": nombre},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]

def crear_equipo(sector_id: int, nro_serie: str = "A1") -> int:
    res = client.post(
        "/equipos/",
        json={
            "nombre": "Algo",
            "marca": "Algo",
            "numero_serie": nro_serie,
            "categoria": "balanza",
            "sector_id": sector_id,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]

def test_crear_insumo_quimico():
    unidad_id = crear_unidad_medida()
    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Algo"
    assert data["tipo"] == "otro"
    assert data["unidad_medida"]["nombre"] == "Kilogramo"
    assert data["activo"] is True
    assert "id" in data

def test_crear_insumo_quimico_duplicado_activo():
    cli = client
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )

    response = cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )

    assert response.status_code == 400

def test_crear_insumo_quimico_duplicado_inactivo():
    cli = client
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_q_id = res_post.json()["id"]
    res_del = cli.delete(f"/insumos-quimicos/{insumo_q_id}")
    assert res_del.status_code == 200

    response = cli.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )

    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["insumo_quimico_id"] == insumo_q_id
    assert "code" in data["detail"]
    assert response.headers.get("X-Insumo-Quimico-Id") == str(insumo_q_id)

def test_crear_insumo_quimico_tipo_invalido():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "papel",
            "unidad_medida_id": unidad_id,
        },
    )
    assert response.status_code == 422

def test_crear_insumo_quimico_con_unidad_inexistente():
    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": 25,
        },
    )
    assert response.status_code == 404

def test_crear_insumo_quimico_con_unidad_inactiva():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_del = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del.status_code == 200

    res = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "La unidad de medida asociada se encuentra dada de baja. Debe reactivarse la unidad de medida primero"

def test_dar_alta_insumo_quimico_con_unidad_inactiva():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_id = res_post.json()["id"]
    res_del_ins = client.delete(f"/insumos-quimicos/{insumo_id}")
    assert res_del_ins.status_code == 200

    res_del_uni = client.delete(f"/unidades-de-medida/{unidad_id}")
    assert res_del_uni.status_code == 200

    res_put = client.put(
        f"/insumos-quimicos/{insumo_id}",
        json={"activo": True},
    )
    assert res_put.status_code == 400
    assert res_put.json()["detail"] == "La unidad de medida asociada se encuentra dada de baja. Debe reactivarse la unidad de medida primero"

def test_dar_alta_insumo_quimico_con_unidad_activa():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_id = res_post.json()["id"]
    res_del_ins = client.delete(f"/insumos-quimicos/{insumo_id}")
    assert res_del_ins.status_code == 200

    res_put = client.put(
        f"/insumos-quimicos/{insumo_id}",
        json={"activo": True},
    )
    assert res_put.status_code == 200
    assert res_put.json()["activo"] is True

def test_listar_insumos_quimicos():
    res = client.get("/insumos-quimicos/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_obtener_insumo_quimico_por_id():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_id = res_post.json()["id"]

    res_get = client.get(f"/insumos-quimicos/{insumo_id}")
    assert res_get.status_code == 200

def test_obtener_insumo_quimico_inexistente():
    res = client.get("/insumos-quimicos/9999")
    assert res.status_code == 404

def test_actualizar_insumo_quimico():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_id = res_post.json()["id"]

    res_put = client.put(
        f"/insumos-quimicos/{insumo_id}",
        json={"nombre": "aLGO"},
    )
    assert res_put.status_code == 200

def test_eliminar_insumo_quimico():
    unidad_id = crear_unidad_medida(nombre="Kilogramo")
    res_post = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Algo",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
        },
    )
    insumo_id = res_post.json()["id"]

    res_del = client.delete(f"/insumos-quimicos/{insumo_id}")
    assert res_del.status_code == 200

def test_crear_insumo_quimico_asociado_a_sector():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
            "equipo_id": None,
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    assert data["sector"]["id"] == sector_id
    assert data["equipo"] is None

def test_crear_insumo_quimico_asociado_a_equipo():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector()
    equipo_id = crear_equipo(sector_id)

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "equipo_id": equipo_id,
            "sector_id": None,
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    assert data["equipo"]["id"] == equipo_id
    assert data["sector"] is None

def test_no_permitir_equipo_y_sector():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector()
    equipo_id = crear_equipo(sector_id)

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "equipo_id": equipo_id,
            "sector_id": sector_id,
        },
    )

    assert response.status_code == 400

def test_permitir_insumo_sin_equipo_ni_sector():
    unidad_id = crear_unidad_medida()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "equipo_id": None,
            "sector_id": None,
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()

    assert data["equipo"] is None
    assert data["sector"] is None

def test_crear_insumo_con_equipo_inexistente():
    unidad_id = crear_unidad_medida()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "equipo_id": 9999,
            "sector_id": None,
        },
    )

    assert response.status_code == 404

def test_crear_insumo_con_sector_inexistente():
    unidad_id = crear_unidad_medida()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "equipo_id": None,
            "sector_id": 9999,
        },
    )

    assert response.status_code == 404

def test_crear_insumo_quimico_con_consumo():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "algo",
            "tipo": "detergente",
            "consumo": 123.456,
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
            "equipo_id": None,
        },
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert float(data["consumo"]) == 123.456

def test_crear_insumo_quimico_consumo_por_defecto():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Producto",
            "tipo": "otro",
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
            "equipo_id": None,
        },
    )

    assert response.status_code == 201, response.text
    assert float(response.json()["consumo"]) == 0

def test_consumo_con_mas_de_tres_decimales():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector()

    response = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Producto",
            "tipo": "otro",
            "consumo": 12.3456,
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
            "equipo_id": None,
        },
    )

    assert response.status_code == 422