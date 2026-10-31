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

def test_listar_insumos_quimicos_sin_filtro_incluye_inactivos():
    unidad_id = crear_unidad_medida()

    insumo_activo = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo activo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
        },
    ).json()

    insumo_inactivo = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo dado de baja",
            "tipo": "desinfectante",
            "unidad_medida_id": unidad_id,
        },
    ).json()
    client.delete(f"/insumos-quimicos/{insumo_inactivo['id']}")

    res = client.get("/insumos-quimicos/")

    assert res.status_code == 200
    # Sin filtros se listan también los dados de baja, para que las vistas
    # histories puedan resolver el nombre de recursos inactivos.
    assert {i["id"] for i in res.json()} == {insumo_activo["id"], insumo_inactivo["id"]}

def test_listar_insumos_quimicos_por_sector_solo_activos():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector(nombre="Sector filtrado")
    otro_sector_id = crear_sector(nombre="Otro sector")

    # 1. Insumo del Sector
    insumo_asociado = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo del sector",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
        },
    ).json()

    # 2. Insumo Global (Sin sector ni equipo)
    insumo_global = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo global",
            "tipo": "desinfectante",
            "unidad_medida_id": unidad_id,
        },
    ).json()

    # 3. Insumo Inactivo (No debe venir)
    insumo_inactivo = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo inactivo del sector",
            "tipo": "desinfectante",
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
        },
    ).json()
    client.delete(f"/insumos-quimicos/{insumo_inactivo['id']}")

    # 4. Insumo de otro sector (No debe venir)
    client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo de otro sector",
            "tipo": "desengrasante",
            "unidad_medida_id": unidad_id,
            "sector_id": otro_sector_id,
        },
    )

    response = client.get(f"/insumos-quimicos/?sector_id={sector_id}")

    assert response.status_code == 200
    ids_obtenidos = [insumo["id"] for insumo in response.json()]

    # Usamos set() para que no importe el orden en que los devuelve
    assert set(ids_obtenidos) == {insumo_asociado["id"], insumo_global["id"]}

def test_listar_insumos_quimicos_por_equipo_solo_activos():
    unidad_id = crear_unidad_medida()
    sector_id = crear_sector(nombre="Sector del equipo")
    equipo_id = crear_equipo(sector_id, nro_serie="EQUIPO-FILTRO")

    # 1. Insumo específico del Equipo
    insumo_equipo = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo del equipo",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "equipo_id": equipo_id,
        },
    ).json()

    # 2. Insumo del Sector al que pertenece el equipo (HERENCIA)
    insumo_sector = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo del sector",
            "tipo": "detergente",
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
        },
    ).json()

    # 3. Insumo Global (De toda la planta)
    insumo_global = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo global",
            "tipo": "desengrasante",
            "unidad_medida_id": unidad_id,
        },
    ).json()

    # 4. Insumo Inactivo del equipo (No debe venir)
    insumo_inactivo = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": "Insumo inactivo",
            "tipo": "desinfectante",
            "unidad_medida_id": unidad_id,
            "equipo_id": equipo_id,
        },
    ).json()
    client.delete(f"/insumos-quimicos/{insumo_inactivo['id']}")

    response = client.get(f"/insumos-quimicos/?equipo_id={equipo_id}")

    assert response.status_code == 200
    ids_obtenidos = [insumo["id"] for insumo in response.json()]

    # Verificamos que trajo exactamente los 3 niveles permitidos
    assert set(ids_obtenidos) == {insumo_equipo["id"], insumo_sector["id"], insumo_global["id"]}

def test_no_permitir_filtrar_insumos_quimicos_por_sector_y_equipo():
    response = client.get("/insumos-quimicos/?sector_id=1&equipo_id=1")

    assert response.status_code == 400

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

# --- Búsqueda de texto libre ---

TIPO_VALIDO = "detergente"  


def sufijo_unico():
    return uuid.uuid4().hex[:8]


def crear_quimico(nombre, unidad_id, tipo=TIPO_VALIDO, sector_id=None, equipo_id=None):
    res = client.post(
        "/insumos-quimicos/",
        json={
            "nombre": nombre,
            "tipo": tipo,
            "unidad_medida_id": unidad_id,
            "sector_id": sector_id,
            "equipo_id": equipo_id,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def ids_buscados(**params):
    res = client.get("/insumos-quimicos/", params=params)
    assert res.status_code == 200, res.text
    return {q["id"] for q in res.json()}


def test_busqueda_parcial_sin_mayusculas_ni_acentos():
    sufijo = sufijo_unico()
    quimico = crear_quimico(f"Hipoclorito Sódico {sufijo}", crear_unidad_medida())

    for texto in [f"hipoclorito sodico {sufijo}", f"HIPOCLORITO SÓDICO {sufijo.upper()}", f"clorito sodico {sufijo}"]:
        assert quimico["id"] in ids_buscados(busqueda=texto)


def test_busqueda_por_unidad_de_medida():
    quimico = crear_quimico(f"Alcohol {sufijo_unico()}", crear_unidad_medida())

    assert quimico["id"] in ids_buscados(busqueda="kilogramo")
    assert quimico["id"] in ids_buscados(busqueda="kg")


def test_busqueda_por_tipo():
    quimico = crear_quimico(f"Sanitizante {sufijo_unico()}", crear_unidad_medida())

    assert quimico["id"] in ids_buscados(busqueda=TIPO_VALIDO)


def test_busqueda_por_nombre_de_sector():
    sufijo = sufijo_unico()
    sector_id = crear_sector(f"Cámara Fría {sufijo}")
    quimico = crear_quimico(f"Desinfectante {sufijo}", crear_unidad_medida(), sector_id=sector_id)

    assert quimico["id"] in ids_buscados(busqueda=f"camara fria {sufijo}")


def test_busqueda_por_nombre_de_equipo():
    sufijo = sufijo_unico()
    sector_id = crear_sector(f"Sector {sufijo}")
    res = client.post(
        "/equipos/",
        json={
            "nombre": f"Marmita {sufijo}",
            "marca": "Marca",
            "numero_serie": f"NS-{sufijo}",
            "categoria": "balanza",
            "sector_id": sector_id,
        },
    )
    assert res.status_code == 201, res.text
    quimico = crear_quimico(
        f"Antical {sufijo}", crear_unidad_medida(), equipo_id=res.json()["id"]
    )

    assert quimico["id"] in ids_buscados(busqueda=f"marmita {sufijo}")


def test_busqueda_incluye_insumos_generales():
    # Sin sector ni equipo: es el caso que justifica el outer join
    sufijo = sufijo_unico()
    general = crear_quimico(f"Lejía General {sufijo}", crear_unidad_medida())

    assert general["id"] in ids_buscados(busqueda=f"lejia general {sufijo}")


def test_busqueda_excluye_los_que_no_coinciden():
    sufijo = sufijo_unico()
    unidad_id = crear_unidad_medida()
    coincide = crear_quimico(f"Cloro {sufijo}", unidad_id)
    no_coincide = crear_quimico(f"Soda {sufijo_unico()}", unidad_id)

    resultado = ids_buscados(busqueda=f"cloro {sufijo}")
    assert coincide["id"] in resultado
    assert no_coincide["id"] not in resultado


def test_busqueda_sin_resultados():
    crear_quimico(f"Vinagre {sufijo_unico()}", crear_unidad_medida())

    assert ids_buscados(busqueda=f"zzz{sufijo_unico()}") == set()


def test_busqueda_no_interpreta_comodines():
    quimico = crear_quimico(f"Peróxido{sufijo_unico()}", crear_unidad_medida())

    # Si "%" fuera comodín, devolvería todo el listado
    assert quimico["id"] not in ids_buscados(busqueda="%")


def test_busqueda_convive_con_filtro_de_sector():
    sufijo = sufijo_unico()
    unidad_id = crear_unidad_medida()
    sector_a = crear_sector(f"Sector A {sufijo}")
    sector_b = crear_sector(f"Sector B {sufijo}")
    en_a = crear_quimico(f"Ácido {sufijo} 1", unidad_id, sector_id=sector_a)
    en_b = crear_quimico(f"Ácido {sufijo} 2", unidad_id, sector_id=sector_b)
    general = crear_quimico(f"Ácido {sufijo} 3", unidad_id)
    texto = f"acido {sufijo}"

    # Solo con la búsqueda aparecen los tres
    assert ids_buscados(busqueda=texto) == {en_a["id"], en_b["id"], general["id"]}

    # Con sector_id se combinan (AND): los del sector pedido y los generales
    assert ids_buscados(busqueda=texto, sector_id=sector_a) == {en_a["id"], general["id"]}


def test_busqueda_incluye_insumos_dados_de_baja():
    # Sin filtros de sector ni equipo el listado devuelve también los inactivos
    sufijo = sufijo_unico()
    quimico = crear_quimico(f"Amoníaco {sufijo}", crear_unidad_medida())
    assert client.delete(f"/insumos-quimicos/{quimico['id']}").status_code == 200

    assert quimico["id"] in ids_buscados(busqueda=f"amoniaco {sufijo}")