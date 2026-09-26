from fastapi.testclient import TestClient
from src.main import app
# Importa la fixture autouse que recrea la base entre tests.
from tests.database import session

client = TestClient(app)


def crear_tipo(nombre: str = "Esponja", prefijo: str = "ESP") -> int:
    res = client.post(
        "/tipos-elemento-limpieza/",
        json={"nombre": nombre, "prefijo": prefijo},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def crear_sector(nombre: str) -> int:
    res = client.post("/sectores/", json={"nombre": nombre})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def crear_equipo(sector_id: int, nro_serie: str = "SN-ELEMENTOS") -> int:
    res = client.post(
        "/equipos/",
        json={
            "nombre": "Equipo",
            "marca": "Marca",
            "numero_serie": nro_serie,
            "categoria": "balanza",
            "sector_id": sector_id,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def crear_elemento(
    tipo_id: int,
    nombre: str,
    sector_id: int | None = None,
    equipo_id: int | None = None,
) -> dict:
    res = client.post(
        "/elementos-limpieza/",
        json={
            "nombre": nombre,
            "tipo_id": tipo_id,
            "sector_id": sector_id,
            "equipo_id": equipo_id,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_listar_elementos_limpieza_por_sector_solo_activos():
    tipo_id = crear_tipo()
    sector_id = crear_sector("Sector de limpieza")
    otro_sector_id = crear_sector("Otro sector de limpieza")

    # 1. Elemento del sector
    del_sector = crear_elemento(tipo_id, "Esponja Sector", sector_id=sector_id)

    # 2. Elemento general (sin sector ni equipo)
    general = crear_elemento(tipo_id, "Esponja General")

    # 3. Elemento inactivo del sector (no debe venir)
    inactivo = crear_elemento(tipo_id, "Esponja Baja", sector_id=sector_id)
    assert client.delete(f"/elementos-limpieza/{inactivo['id']}").status_code == 200

    # 4. Elemento de otro sector (no debe venir)
    crear_elemento(tipo_id, "Esponja Ajena", sector_id=otro_sector_id)

    res = client.get(f"/elementos-limpieza/por-sector/{sector_id}")

    assert res.status_code == 200, res.text
    ids = {e["id"] for e in res.json()}
    assert ids == {del_sector["id"], general["id"]}


def test_listar_elementos_limpieza_por_equipo_aisla_los_del_sector():
    tipo_id = crear_tipo()
    sector_id = crear_sector("Sector del equipo")
    equipo_id = crear_equipo(sector_id)

    # 1. Elemento propio del equipo
    del_equipo = crear_elemento(tipo_id, "Esponja Equipo", equipo_id=equipo_id)

    # 2. Elemento del sector al que pertenece el equipo.
    #    A diferencia de los insumos, aquí NO se hereda: los elementos de
    #    limpieza se aíslan por destino.
    del_sector = crear_elemento(tipo_id, "Esponja Sector", sector_id=sector_id)

    # 3. Elemento general
    general = crear_elemento(tipo_id, "Esponja General")

    res = client.get(f"/elementos-limpieza/por-equipo/{equipo_id}")

    assert res.status_code == 200, res.text
    ids = {e["id"] for e in res.json()}

    # El del sector queda explícitamente afuera.
    assert ids == {del_equipo["id"], general["id"]}
    assert del_sector["id"] not in ids


def test_listar_elementos_limpieza_por_equipo_no_trae_elementos_de_otros_equipos():
    tipo_id = crear_tipo()
    sector_id = crear_sector("Sector compartido")
    equipo_id = crear_equipo(sector_id, nro_serie="SN-PROPIO")
    otro_equipo_id = crear_equipo(sector_id, nro_serie="SN-OTRO")

    propio = crear_elemento(tipo_id, "Esponja Propia", equipo_id=equipo_id)
    de_otro = crear_elemento(tipo_id, "Esponja Otra", equipo_id=otro_equipo_id)

    res = client.get(f"/elementos-limpieza/por-equipo/{equipo_id}")

    assert res.status_code == 200, res.text
    ids = {e["id"] for e in res.json()}
    assert propio["id"] in ids
    assert de_otro["id"] not in ids


def test_listar_elementos_limpieza_por_sector_excluye_los_del_equipo():
    tipo_id = crear_tipo()
    sector_id = crear_sector("Sector con equipos")
    equipo_id = crear_equipo(sector_id)

    crear_elemento(tipo_id, "Esponja Equipo", equipo_id=equipo_id)

    res = client.get(f"/elementos-limpieza/por-sector/{sector_id}")

    assert res.status_code == 200, res.text
    assert res.json() == []


def test_listar_elementos_limpieza_sin_filtro_solo_activos():
    tipo_id = crear_tipo()
    activo = crear_elemento(tipo_id, "Esponja Activa")
    inactivo = crear_elemento(tipo_id, "Esponja Inactiva")
    assert client.delete(f"/elementos-limpieza/{inactivo['id']}").status_code == 200

    res = client.get("/elementos-limpieza/")

    assert res.status_code == 200, res.text
    # A diferencia de /insumos-quimicos/, acá el listado sin filtro
    # también excluye los dados de baja.
    assert {e["id"] for e in res.json()} == {activo["id"]}


def test_listar_elementos_limpieza_por_sector_inexistente():
    res = client.get("/elementos-limpieza/por-sector/9999")

    assert res.status_code == 404


def test_listar_elementos_limpieza_por_equipo_inexistente():
    res = client.get("/elementos-limpieza/por-equipo/9999")

    assert res.status_code == 404


def test_no_permitir_elemento_con_sector_y_equipo_a_la_vez():
    tipo_id = crear_tipo()
    sector_id = crear_sector("Sector exclusivo")
    equipo_id = crear_equipo(sector_id)

    res = client.post(
        "/elementos-limpieza/",
        json={
            "nombre": "Esponja Mixta",
            "tipo_id": tipo_id,
            "sector_id": sector_id,
            "equipo_id": equipo_id,
        },
    )

    # Lo corta el validador de ubicacion_exclusiva del schema, antes de
    # llegar al service.
    assert res.status_code == 422
