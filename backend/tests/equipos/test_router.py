from fastapi.testclient import TestClient
from src.main import app
from tests.database import session
import uuid

client = TestClient(app)

# Función auxiliar para generar nombres únicos y evitar colisiones entre tests
def generar_string_unico(prefijo: str):
    return f"{prefijo}_{uuid.uuid4().hex[:6]}"

# Función auxiliar para crear un sector rápido para los tests
def crear_sector_auxiliar(nombre: str | None = None):
    nombre_sector = nombre or generar_string_unico("Sector")
    res = client.post("/sectores/", json={"nombre": nombre_sector})
    return res.json()["id"]

def test_crear_equipo():
    sector_id = crear_sector_auxiliar()
    
    response = client.post(
        "/equipos/", 
        json={
            "nombre": "Heladera de prueba",
            "marca": "Bambi",
            "numero_serie": generar_string_unico("SN"),
            "categoria": "heladera",
            "sector_id": sector_id,
            "ubicacion": "Cocina"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Heladera de prueba"
    assert data["marca"] == "Bambi"
    assert data["sector"]["id"] == sector_id
    assert data["activo"] is True
    assert "id" in data

def test_crear_equipo_duplicado_activo():
    sector_id = crear_sector_auxiliar()
    n_serie = generar_string_unico("SN")
    payload = {
        "nombre": "Horno Duplicado", 
        "marca": "Pauna", 
        "numero_serie": n_serie,
        "categoria": "horno", 
        "sector_id": sector_id
    }
    
    # Primera creación exitosa
    client.post("/equipos/", json=payload)
    
    # Segunda creación falla por duplicado activo (409 Conflict)
    response = client.post("/equipos/", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "Ya existe un equipo con el mismo nombre, marca y número de serie."

def test_crear_equipo_requiere_reactivacion():
    sector_id = crear_sector_auxiliar()
    n_serie = generar_string_unico("SN")
    payload = {
        "nombre": "Balanza Inactiva", 
        "marca": "Systel", 
        "numero_serie": n_serie,
        "categoria": "balanza", 
        "sector_id": sector_id
    }
    
    # 1. Creacion
    res_post = client.post("/equipos/", json=payload)
    equipo_id = res_post.json()["id"]
    
    # 2. Baja lógica
    client.delete(f"/equipos/{equipo_id}")
    
    # 3. Se intenta crear exactamente el mismo
    res_conflicto = client.post("/equipos/", json=payload)
    
    # Se espera el 409 personalizado con el ID para el popup
    assert res_conflicto.status_code == 409
    detail = res_conflicto.json()["detail"]
    assert detail["code"] == "El equipo ya existe pero está dado de baja."
    assert detail["equipo_id"] == equipo_id

def test_crear_equipo_categoria_invalida():
    sector_id = crear_sector_auxiliar()
    response = client.post(
        "/equipos/",
        json={
            "nombre": "Camion", 
            "marca": "Ford",
            "numero_serie": "111",
            "categoria": "vehiculo",
            "sector_id": sector_id
        } 
    )
    assert response.status_code == 422

def test_listar_equipos():
    response = client.get("/equipos/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_actualizar_equipo_activo():
    sector_id = crear_sector_auxiliar()
    res_post = client.post(
        "/equipos/", 
        json={
            "nombre": "Termometro Viejo", 
            "marca": "Testo", 
            "numero_serie": generar_string_unico("SN"),
            "categoria": "termometro",
            "sector_id": sector_id
        }
    )
    equipo_id = res_post.json()["id"]

    res_put = client.put(
        f"/equipos/{equipo_id}", 
        json={"nombre": "Termometro Nuevo", "ubicacion": "Laboratorio"}
    )
    assert res_put.status_code == 200
    assert res_put.json()["nombre"] == "Termometro Nuevo"
    assert res_put.json()["ubicacion"] == "Laboratorio"

def test_bloquear_baja_por_put():
    sector_id = crear_sector_auxiliar()
    res_post = client.post(
        "/equipos/", 
        json={
            "nombre": "Equipo a apagar", 
            "marca": "Marca", 
            "numero_serie": generar_string_unico("SN"),
            "categoria": "otro",
            "sector_id": sector_id
        }
    )
    equipo_id = res_post.json()["id"]

    # Se intenta dar de baja mediante PUT (Debe devolver 400 BadRequest)
    res_put = client.put(f"/equipos/{equipo_id}", json={"activo": False})
    assert res_put.status_code == 400

def test_eliminar_equipo_y_verificar_inactivo():
    sector_id = crear_sector_auxiliar()
    res_post = client.post(
        "/equipos/", 
        json={
            "nombre": "Horno a eliminar", 
            "marca": "Zanella", 
            "numero_serie": generar_string_unico("SN"),
            "categoria": "horno",
            "sector_id": sector_id
        }
    )
    equipo_id = res_post.json()["id"]

    # Se elimina
    res_del = client.delete(f"/equipos/{equipo_id}")
    assert res_del.status_code == 200
    assert res_del.json()["activo"] is False

    # Al consultar, debe existir pero estar inactivo
    res_get = client.get(f"/equipos/{equipo_id}")
    assert res_get.status_code == 200
    assert res_get.json()["activo"] is False

def test_reactivar_equipo():
    sector_id = crear_sector_auxiliar()
    res_post = client.post(
        "/equipos/", 
        json={
            "nombre": "Equipo a reactivar", 
            "marca": "MarcaX", 
            "numero_serie": generar_string_unico("SN"),
            "categoria": "otro",
            "sector_id": sector_id
        }
    )
    equipo_id = res_post.json()["id"]

    client.delete(f"/equipos/{equipo_id}") # Se da de baja
    
    # Se reactiva con un PUT
    res_put = client.put(f"/equipos/{equipo_id}", json={"activo": True})
    assert res_put.status_code == 200
    assert res_put.json()["activo"] is True

# --- Búsqueda de texto libre ---

def crear_equipo_auxiliar(sector_id, nombre="Balanza", marca="Ohaus", numero_serie=None, categoria="otro"):
    res = client.post("/equipos/", json={
        "nombre": nombre,
        "marca": marca,
        "numero_serie": numero_serie or generar_string_unico("SN"),
        "categoria": categoria,
        "sector_id": sector_id,
    })
    assert res.status_code == 201
    return res.json()

def ids_buscados(**params):
    res = client.get("/equipos/", params=params)
    assert res.status_code == 200
    return {e["id"] for e in res.json()}

def sufijo_unico():
    return uuid.uuid4().hex[:8]

def test_busqueda_parcial_sin_mayusculas_ni_acentos():
    sufijo = sufijo_unico()
    equipo = crear_equipo_auxiliar(crear_sector_auxiliar(), nombre=f"Balanza Analítica {sufijo}")

    for texto in [f"analitica {sufijo}", f"ANALÍTICA {sufijo.upper()}", f"lanza analitica {sufijo}"]:
        assert equipo["id"] in ids_buscados(busqueda=texto)

def test_busqueda_por_marca_y_numero_de_serie():
    sufijo = sufijo_unico()
    equipo = crear_equipo_auxiliar(
        crear_sector_auxiliar(), marca=f"Mettler{sufijo}", numero_serie=f"NS-{sufijo}"
    )

    assert equipo["id"] in ids_buscados(busqueda=f"mettler{sufijo}")
    assert equipo["id"] in ids_buscados(busqueda=f"ns-{sufijo}")

def test_busqueda_por_nombre_de_sector():
    sufijo = sufijo_unico()
    sector_id = crear_sector_auxiliar(nombre=f"Laboratorio Químico {sufijo}")
    equipo = crear_equipo_auxiliar(sector_id)

    assert equipo["id"] in ids_buscados(busqueda=f"quimico {sufijo}")

def test_busqueda_sin_resultados():
    assert ids_buscados(busqueda=f"zzz{sufijo_unico()}") == set()

def test_busqueda_no_interpreta_comodines():
    sufijo = sufijo_unico()
    # Sin guiones bajos ni % en ningún campo visible del equipo
    sector_id = crear_sector_auxiliar(nombre=f"Sector{sufijo}")
    equipo = crear_equipo_auxiliar(
        sector_id, nombre=f"Horno{sufijo}", marca=f"Pauna{sufijo}", numero_serie=f"NS{sufijo}"
    )

    # Si "%" o "_" fueran comodines, este equipo aparecería en los resultados
    assert equipo["id"] not in ids_buscados(busqueda="%")
    assert equipo["id"] not in ids_buscados(busqueda="_")

def test_busqueda_convive_con_otros_filtros():
    sufijo = sufijo_unico()
    sector_a = crear_sector_auxiliar()
    sector_b = crear_sector_auxiliar()
    en_a = crear_equipo_auxiliar(sector_a, nombre=f"Termómetro {sufijo}")
    en_b = crear_equipo_auxiliar(sector_b, nombre=f"Termómetro {sufijo}")
    texto = f"termometro {sufijo}"

    # Solo con la búsqueda aparecen los dos
    assert ids_buscados(busqueda=texto) == {en_a["id"], en_b["id"]}

    # Con sector_id se combinan (AND): solo el del sector pedido
    assert ids_buscados(busqueda=texto, sector_id=sector_a) == {en_a["id"]}

    # Con activo: al dar de baja uno, el filtro de estado también se respeta
    client.delete(f"/equipos/{en_a['id']}")
    assert ids_buscados(busqueda=texto, activo="true") == {en_b["id"]}
    assert ids_buscados(busqueda=texto, activo="false") == {en_a["id"]}