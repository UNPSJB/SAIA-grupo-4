from datetime import date, datetime, timedelta
import uuid
from fastapi.testclient import TestClient
from src.auth.dependencies import get_current_user
from src.lotes_insumo.models import LoteInsumo
from src.main import app
from tests.database import session, TestingSessionLocal

client = TestClient(app)


# --- Helpers ---

def sufijo_unico():
    return uuid.uuid4().hex[:8]


def en_dias(dias: int) -> str:
    return (date.today() + timedelta(days=dias)).isoformat()


def crear_unidad_medida(nombre: str = "Kilogramo", simbolo: str = "kg", tipo: str = "masa") -> int:
    res = client.post(
        "/unidades-de-medida/",
        json={"nombre": nombre, "simbolo": simbolo, "tipo_magnitud": tipo},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def crear_insumo(nombre: str | None = None, unidad_id: int | None = None) -> dict:
    res = client.post(
        "/insumos/",
        json={
            "nombre": nombre or f"Harina {sufijo_unico()}",
            "unidad_medida_id": unidad_id or crear_unidad_medida(),
            "categoria": "materia prima",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def crear_lote(
    insumo_id: int,
    codigo: str = "L-001",
    fecha: str | None = None,
    cantidad_inicial: float = 100.0,
) -> dict:
    res = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo_id,
            "codigo_lote": codigo,
            "fecha_vencimiento": fecha or en_dias(90),
            "cantidad_inicial": cantidad_inicial,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def ids_listados(**params):
    res = client.get("/lotes-insumo/", params=params)
    assert res.status_code == 200, res.text
    return {lote["id"] for lote in res.json()}


def inhabilitar_lote(lote_id: int, motivo: str = "Contaminación detectada en control de calidad"):
    return client.patch(f"/lotes-insumo/{lote_id}/inhabilitar", json={"motivo": motivo})


def crear_lote_vencido_en_db(
    insumo_id: int,
    codigo: str = "L-VENC",
    dias_atras: int = 1,
    cantidad_inicial: float = 100.0,
) -> dict:
    with TestingSessionLocal() as db:
        lote = LoteInsumo(
            insumo_id=insumo_id,
            codigo_lote=codigo,
            fecha_vencimiento=date.today() - timedelta(days=dias_atras),
            cantidad_inicial=cantidad_inicial,
            cantidad_actual=cantidad_inicial,
            activo=True,
        )
        db.add(lote)
        db.commit()
        db.refresh(lote)
        lote_id = lote.id
    res = client.get(f"/lotes-insumo/{lote_id}")
    assert res.status_code == 200, res.text
    return res.json()


def crear_lotes_en_los_tres_estados(insumo_id: int):
    activo = crear_lote(insumo_id, codigo="L-ACTIVO", fecha=en_dias(30))
    vencido = crear_lote_vencido_en_db(insumo_id, codigo="L-VENCIDO", dias_atras=1)
    # Vencido por fecha, pero inhabilitado: tiene que figurar como inhabilitado
    inhabilitado = crear_lote_vencido_en_db(insumo_id, codigo="L-INHAB", dias_atras=1)
    assert inhabilitar_lote(inhabilitado["id"]).status_code == 200
    return activo, vencido, inhabilitado


# --- Crear ---

def test_crear_lote_insumo():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-2026-001",
            "fecha_vencimiento": "2027-03-15",
            "cantidad_inicial": 50.5,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["insumo_id"] == insumo["id"]
    assert data["codigo_lote"] == "L-2026-001"
    assert data["fecha_vencimiento"] == "2027-03-15"
    assert float(data["cantidad_inicial"]) == 50.5
    assert float(data["cantidad_actual"]) == 50.5
    assert data["activo"] is True
    assert "id" in data


def test_crear_lote_queda_activo_aunque_se_envie_inactivo():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-ACT",
            "fecha_vencimiento": "2027-03-15",
            "cantidad_inicial": 25,
            "activo": False,
        },
    )
    assert response.status_code == 201
    assert response.json()["activo"] is True


def test_crear_lote_sin_codigo():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={"insumo_id": insumo["id"], "fecha_vencimiento": "2027-03-15"},
    )
    assert response.status_code == 422


def test_crear_lote_sin_fecha_vencimiento():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={"insumo_id": insumo["id"], "codigo_lote": "L-001"},
    )
    assert response.status_code == 422


def test_crear_lote_codigo_vacio_o_en_blanco():
    insumo = crear_insumo()
    for codigo in ["", "   "]:
        response = client.post(
            "/lotes-insumo/",
            json={
                "insumo_id": insumo["id"],
                "codigo_lote": codigo,
                "fecha_vencimiento": "2027-03-15",
                "cantidad_inicial": 10,
            },
        )
        assert response.status_code == 422


def test_crear_lote_fecha_invalida():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-001",
            "fecha_vencimiento": "no-es-una-fecha",
            "cantidad_inicial": 10,
        },
    )
    assert response.status_code == 422


def test_crear_lote_insumo_inexistente():
    response = client.post(
        "/lotes-insumo/",
        json={"insumo_id": 9999, "codigo_lote": "L-001", "fecha_vencimiento": "2027-03-15", "cantidad_inicial": 10},
    )
    assert response.status_code == 404


def test_crear_lote_insumo_dado_de_baja():
    insumo = crear_insumo()
    assert client.delete(f"/insumos/{insumo['id']}").status_code == 200

    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-001",
            "fecha_vencimiento": "2027-03-15",
            "cantidad_inicial": 10,
        },
    )
    assert response.status_code == 400


def test_crear_lote_ignora_campos_de_inhabilitacion():
    insumo = crear_insumo()
    response = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-AUD",
            "fecha_vencimiento": "2027-03-15",
            "cantidad_inicial": 10,
            "motivo_inhabilitacion": "inventado",
            "usuario_inhabilitacion_id": 1,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["motivo_inhabilitacion"] is None
    assert data["fecha_inhabilitacion"] is None
    assert data["usuario_inhabilitacion_id"] is None


def test_lote_no_gestiona_cantidades_ni_stock():
    lote = crear_lote(crear_insumo()["id"])
    for campo in ["cantidad", "stock", "saldo"]:
        assert campo not in lote


# --- Leer y listar ---

def test_leer_lote_por_id():
    insumo = crear_insumo()
    lote = crear_lote(insumo["id"], codigo="L-LEER")

    response = client.get(f"/lotes-insumo/{lote['id']}")
    assert response.status_code == 200
    assert response.json()["codigo_lote"] == "L-LEER"
    assert response.json()["insumo_id"] == insumo["id"]


def test_leer_lote_inexistente():
    response = client.get("/lotes-insumo/9999")
    assert response.status_code == 404


def test_listar_lotes():
    response = client.get("/lotes-insumo/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listar_lotes_filtrando_por_insumo():
    unidad_id = crear_unidad_medida()
    insumo_a = crear_insumo(unidad_id=unidad_id)
    insumo_b = crear_insumo(unidad_id=unidad_id)
    lote_a = crear_lote(insumo_a["id"], codigo="L-A")
    lote_b = crear_lote(insumo_b["id"], codigo="L-B")

    assert ids_listados(insumo_id=insumo_a["id"]) == {lote_a["id"]}
    assert ids_listados(insumo_id=insumo_b["id"]) == {lote_b["id"]}


# --- Estado, filtros y orden del listado ---

def test_lote_devuelve_su_estado():
    insumo = crear_insumo()
    activo = crear_lote(insumo["id"], codigo="L-E1", fecha=en_dias(30))
    vencido = crear_lote_vencido_en_db(insumo["id"], codigo="L-E2", dias_atras=1)
    inhabilitado = crear_lote(insumo["id"], codigo="L-E3", fecha=en_dias(30))
    assert inhabilitar_lote(inhabilitado["id"]).status_code == 200

    assert activo["estado"] == "activo"
    assert vencido["estado"] == "vencido"
    assert client.get(f"/lotes-insumo/{inhabilitado['id']}").json()["estado"] == "inhabilitado"


def test_lote_que_vence_hoy_sigue_activo():
    lote = crear_lote(crear_insumo()["id"], fecha=en_dias(0))
    assert lote["estado"] == "activo"


def test_lote_vencido_e_inhabilitado_figura_como_inhabilitado():
    lote = crear_lote_vencido_en_db(crear_insumo()["id"], dias_atras=5)
    assert lote["estado"] == "vencido"

    assert inhabilitar_lote(lote["id"]).status_code == 200
    assert client.get(f"/lotes-insumo/{lote['id']}").json()["estado"] == "inhabilitado"


def test_listar_lotes_filtrando_por_estado():
    insumo = crear_insumo()
    activo, vencido, inhabilitado = crear_lotes_en_los_tres_estados(insumo["id"])

    assert ids_listados(insumo_id=insumo["id"], estado="activo") == {activo["id"]}
    assert ids_listados(insumo_id=insumo["id"], estado="vencido") == {vencido["id"]}
    assert ids_listados(insumo_id=insumo["id"], estado="inhabilitado") == {inhabilitado["id"]}
    assert ids_listados(insumo_id=insumo["id"]) == {activo["id"], vencido["id"], inhabilitado["id"]}


def test_listar_lotes_buscando_por_codigo():
    insumo = crear_insumo()
    a = crear_lote(insumo["id"], codigo="ABC-2026-01")
    b = crear_lote(insumo["id"], codigo="XYZ-2026-02")

    # Búsqueda parcial y sin distinguir mayúsculas
    assert ids_listados(insumo_id=insumo["id"], codigo_lote="abc") == {a["id"]}
    assert ids_listados(insumo_id=insumo["id"], codigo_lote="2026") == {a["id"], b["id"]}
    assert ids_listados(insumo_id=insumo["id"], codigo_lote="no-existe") == set()
    # Un texto en blanco no filtra
    assert ids_listados(insumo_id=insumo["id"], codigo_lote="   ") == {a["id"], b["id"]}


def test_listar_lotes_ordenados_por_fecha_de_vencimiento():
    insumo = crear_insumo()
    tarde = crear_lote(insumo["id"], codigo="L-TARDE", fecha=en_dias(60))
    temprano = crear_lote(insumo["id"], codigo="L-TEMPRANO", fecha=en_dias(10))
    medio = crear_lote(insumo["id"], codigo="L-MEDIO", fecha=en_dias(30))

    def ids_en_orden(**params):
        res = client.get("/lotes-insumo/", params={"insumo_id": insumo["id"], **params})
        assert res.status_code == 200, res.text
        return [lote["id"] for lote in res.json()]

    esperado = [temprano["id"], medio["id"], tarde["id"]]
    assert ids_en_orden() == esperado  # por defecto, ascendente
    assert ids_en_orden(orden="asc") == esperado
    assert ids_en_orden(orden="desc") == esperado[::-1]


def test_listar_lotes_combinando_filtros_y_orden():
    insumo = crear_insumo()
    a = crear_lote(insumo["id"], codigo="LOT-A", fecha=en_dias(10))
    b = crear_lote(insumo["id"], codigo="LOT-B", fecha=en_dias(20))
    crear_lote(insumo["id"], codigo="OTRO-C", fecha=en_dias(30))  # no coincide el código
    crear_lote_vencido_en_db(insumo["id"], codigo="LOT-D", dias_atras=3)   # coincide pero está vencido

    res = client.get(
        "/lotes-insumo/",
        params={"insumo_id": insumo["id"], "codigo_lote": "lot", "estado": "activo", "orden": "desc"},
    )
    assert res.status_code == 200, res.text
    assert [lote["id"] for lote in res.json()] == [b["id"], a["id"]]


def test_listar_lotes_estado_u_orden_invalido():
    assert client.get("/lotes-insumo/", params={"estado": "cualquiera"}).status_code == 422
    assert client.get("/lotes-insumo/", params={"orden": "xyz"}).status_code == 422


# --- Modificar ---

def test_modificar_lote_codigo_y_fecha():
    lote = crear_lote(crear_insumo()["id"])

    response = client.put(
        f"/lotes-insumo/{lote['id']}",
        json={"codigo_lote": "L-NUEVO", "fecha_vencimiento": "2028-05-10"},
    )
    assert response.status_code == 200
    assert response.json()["codigo_lote"] == "L-NUEVO"
    assert response.json()["fecha_vencimiento"] == "2028-05-10"


def test_modificar_lote_parcial_no_pisa_el_resto():
    lote = crear_lote(crear_insumo()["id"], codigo="L-ORIGINAL", fecha=en_dias(90))

    response = client.put(
        f"/lotes-insumo/{lote['id']}",
        json={"fecha_vencimiento": "2028-05-10"},
    )
    assert response.status_code == 200
    assert response.json()["codigo_lote"] == "L-ORIGINAL"
    assert response.json()["fecha_vencimiento"] == "2028-05-10"


def test_modificar_lote_codigo_vacio():
    lote = crear_lote(crear_insumo()["id"])

    response = client.put(f"/lotes-insumo/{lote['id']}", json={"codigo_lote": "   "})
    assert response.status_code == 422


def test_modificar_lote_inexistente():
    response = client.put("/lotes-insumo/9999", json={"codigo_lote": "L-X"})
    assert response.status_code == 404


def test_modificar_lote_inhabilitado():
    lote = crear_lote(crear_insumo()["id"])
    inhabilitar_lote(lote["id"])

    response = client.put(f"/lotes-insumo/{lote['id']}", json={"codigo_lote": "L-NUEVO"})
    assert response.status_code == 400


# --- Inhabilitar ---

def test_inhabilitar_lote():
    lote = crear_lote(crear_insumo()["id"])

    response = inhabilitar_lote(lote["id"], "Contaminación detectada en control de calidad")
    assert response.status_code == 200
    data = response.json()
    assert data["activo"] is False
    assert data["estado"] == "inhabilitado"
    assert data["motivo_inhabilitacion"] == "Contaminación detectada en control de calidad"
    assert data["fecha_inhabilitacion"] is not None
    assert isinstance(data["usuario_inhabilitacion_id"], int)


def test_inhabilitar_lote_registra_fecha_y_hora_actual():
    lote = crear_lote(crear_insumo()["id"])

    data = inhabilitar_lote(lote["id"]).json()
    fecha = datetime.fromisoformat(data["fecha_inhabilitacion"])
    assert abs((datetime.now() - fecha).total_seconds()) < 60


def test_inhabilitar_lote_no_lo_borra_y_queda_en_el_detalle():
    lote = crear_lote(crear_insumo()["id"])
    inhabilitar_lote(lote["id"], "Lote con fallas de calidad")

    response = client.get(f"/lotes-insumo/{lote['id']}")
    assert response.status_code == 200
    assert response.json()["activo"] is False
    assert response.json()["motivo_inhabilitacion"] == "Lote con fallas de calidad"


def test_inhabilitar_lote_sin_motivo():
    lote = crear_lote(crear_insumo()["id"])

    response = client.patch(f"/lotes-insumo/{lote['id']}/inhabilitar", json={})
    assert response.status_code == 422
    # El lote sigue activo
    assert client.get(f"/lotes-insumo/{lote['id']}").json()["activo"] is True


def test_inhabilitar_lote_motivo_muy_corto_o_en_blanco():
    lote = crear_lote(crear_insumo()["id"])

    for motivo in ["", "corto", " " * 10]:
        assert inhabilitar_lote(lote["id"], motivo).status_code == 422

    assert client.get(f"/lotes-insumo/{lote['id']}").json()["activo"] is True


def test_inhabilitar_lote_inexistente():
    assert inhabilitar_lote(9999).status_code == 404


def test_inhabilitar_lote_ya_inhabilitado():
    lote = crear_lote(crear_insumo()["id"])
    assert inhabilitar_lote(lote["id"]).status_code == 200

    response = inhabilitar_lote(lote["id"], "Segundo intento de inhabilitación")
    assert response.status_code == 400
    # No se pisa el motivo original
    detalle = client.get(f"/lotes-insumo/{lote['id']}").json()
    assert detalle["motivo_inhabilitacion"] == "Contaminación detectada en control de calidad"


def test_lote_inhabilitado_no_aparece_entre_los_activos():
    insumo = crear_insumo()
    lote = crear_lote(insumo["id"])
    inhabilitar_lote(lote["id"])

    assert lote["id"] not in ids_listados(insumo_id=insumo["id"], estado="activo")

def test_inhabilitar_lote_devuelve_quien_lo_inhabilito():
    lote = crear_lote(crear_insumo()["id"])

    data = inhabilitar_lote(lote["id"]).json()
    persona = data["usuario_inhabilitacion"]
    assert persona["id"] == data["usuario_inhabilitacion_id"]
    assert persona["nombre"]
    assert persona["apellido"]
    # Solo se exponen los datos necesarios
    assert set(persona) == {"id", "nombre", "apellido"}


def test_lote_activo_no_tiene_usuario_de_inhabilitacion():
    lote = crear_lote(crear_insumo()["id"])
    assert lote["usuario_inhabilitacion"] is None


# --- Permisos ---

def test_endpoints_sin_sesion_responden_401():
    # Quitamos el override de administrador que pone tests/database.py
    app.dependency_overrides.pop(get_current_user, None)

    assert client.get("/lotes-insumo/").status_code == 401
    assert client.post(
        "/lotes-insumo/",
        json={"insumo_id": 1, "codigo_lote": "L-001", "fecha_vencimiento": "2027-03-15"},
    ).status_code == 401
    assert client.patch(
        "/lotes-insumo/1/inhabilitar", json={"motivo": "Contaminación detectada"}
    ).status_code == 401


MOTIVO_VENCIDO = "Descarte por fecha de vencimiento alcanzada"


def vencimientos_de_lotes():
    # {id_lote: vencimiento}, solo de la categoría lote_insumo del tablero consolidado
    response = client.get("/vencimientos/")
    assert response.status_code == 200
    return {
        v["entidad_id"]: v
        for v in response.json()
        if v["categoria"] == "lote_insumo"
    }


# Baja desde la alerta

def test_dar_de_baja_lote_vencido():
    lote = crear_lote_vencido_en_db(crear_insumo()["id"], dias_atras=1)

    response = client.patch(f"/lotes-insumo/{lote['id']}/dar-baja-vencido")

    assert response.status_code == 200
    data = response.json()
    assert data["activo"] is False
    assert data["estado"] == "inhabilitado"
    assert data["motivo_inhabilitacion"] == MOTIVO_VENCIDO
    assert data["fecha_inhabilitacion"] is not None
    assert data["usuario_inhabilitacion_id"] is not None


def test_dar_de_baja_lote_no_vencido_falla():
    lote = crear_lote(crear_insumo()["id"], fecha=en_dias(10))

    response = client.patch(f"/lotes-insumo/{lote['id']}/dar-baja-vencido")

    assert response.status_code == 400
    # El lote sigue activo
    assert client.get(f"/lotes-insumo/{lote['id']}").json()["activo"] is True


def test_dar_de_baja_lote_que_vence_hoy_falla():
    # Vence hoy todavía no es vencido (la propiedad estado compara con <)
    lote = crear_lote(crear_insumo()["id"], fecha=en_dias(0))

    response = client.patch(f"/lotes-insumo/{lote['id']}/dar-baja-vencido")

    assert response.status_code == 400


def test_dar_de_baja_lote_ya_dado_de_baja_falla():
    lote = crear_lote_vencido_en_db(crear_insumo()["id"], dias_atras=1)
    client.patch(f"/lotes-insumo/{lote['id']}/dar-baja-vencido")

    response = client.patch(f"/lotes-insumo/{lote['id']}/dar-baja-vencido")

    assert response.status_code == 400


def test_dar_de_baja_lote_inexistente():
    response = client.patch("/lotes-insumo/999999/dar-baja-vencido")

    assert response.status_code == 404


# Alertas en el tablero consolidado

def test_alerta_de_lote_vencido_en_tablero():
    lote = crear_lote_vencido_en_db(crear_insumo()["id"], dias_atras=3)

    alerta = vencimientos_de_lotes()[lote["id"]]

    assert alerta["estado"] == "vencido"
    assert alerta["dias_restantes"] == -3


def test_alerta_preventiva_de_lote_por_vencer():
    lote = crear_lote(crear_insumo()["id"], fecha=en_dias(10))

    alerta = vencimientos_de_lotes()[lote["id"]]

    assert alerta["estado"] == "proximo"
    assert alerta["dias_restantes"] == 10


def test_lote_fuera_del_rango_de_aviso_es_vigente():
    lote = crear_lote(crear_insumo()["id"], fecha=en_dias(40))

    alerta = vencimientos_de_lotes()[lote["id"]]

    assert alerta["estado"] == "vigente"


def test_alerta_se_resuelve_al_confirmar_la_baja():
    lote = crear_lote_vencido_en_db(crear_insumo()["id"], dias_atras=1)
    assert lote["id"] in vencimientos_de_lotes()

    client.patch(f"/lotes-insumo/{lote['id']}/dar-baja-vencido")

    assert lote["id"] not in vencimientos_de_lotes()


def test_lote_inhabilitado_manualmente_no_genera_alerta():
    lote = crear_lote(crear_insumo()["id"], fecha=en_dias(5))
    client.patch(
        f"/lotes-insumo/{lote['id']}/inhabilitar",
        json={"motivo": "Envase dañado en recepción"},
    )

    assert lote["id"] not in vencimientos_de_lotes()


def test_crear_lote_codigo_duplicado_mismo_insumo_falla():
    insumo = crear_insumo()
    crear_lote(insumo["id"], codigo="L-DUP-001")

    res = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "l-dup-001",
            "fecha_vencimiento": en_dias(30),
            "cantidad_inicial": 10,
        },
    )

    assert res.status_code == 400
    assert "codigo" in res.json()["detail"].lower()


def test_crear_lote_mismo_codigo_distinto_insumo_permite():
    insumo_a = crear_insumo(nombre="Harina Test A")
    insumo_b = crear_insumo(
        nombre="Azucar Test B",
        unidad_id=insumo_a["unidad_medida"]["id"],
    )

    lote_a = crear_lote(insumo_a["id"], codigo="L-COMPARTIDO-001")
    lote_b = crear_lote(insumo_b["id"], codigo="L-COMPARTIDO-001")

    assert lote_a["codigo_lote"] == "L-COMPARTIDO-001"
    assert lote_b["codigo_lote"] == "L-COMPARTIDO-001"


def test_modificar_lote_codigo_duplicado_mismo_insumo_falla():
    insumo = crear_insumo()
    crear_lote(insumo["id"], codigo="L-UNICO-1")
    lote_2 = crear_lote(insumo["id"], codigo="L-UNICO-2")

    res = client.put(
        f"/lotes-insumo/{lote_2['id']}",
        json={"codigo_lote": "L-UNICO-1"},
    )

    assert res.status_code == 400
    assert "codigo" in res.json()["detail"].lower()


# Un lote vencido no se ofrece como activo

def test_lote_vencido_no_aparece_como_activo():
    insumo = crear_insumo()
    vencido = crear_lote_vencido_en_db(insumo["id"], codigo="L-VENC", dias_atras=1)
    vigente = crear_lote(insumo["id"], codigo="L-VIG", fecha=en_dias(30))

    response = client.get("/lotes-insumo/", params={"estado": "activo"})

    ids = [l["id"] for l in response.json()]
    assert vigente["id"] in ids
    assert vencido["id"] not in ids


def test_crear_lote_fecha_vencimiento_pasada_falla():
    insumo = crear_insumo()

    res = client.post(
        "/lotes-insumo/",
        json={
            "insumo_id": insumo["id"],
            "codigo_lote": "L-PASADO-001",
            "fecha_vencimiento": en_dias(-1),
            "cantidad_inicial": 10,
        },
    )

    assert res.status_code == 400
    assert "vencimiento" in res.json()["detail"].lower()


def test_modificar_lote_fecha_vencimiento_pasada_falla():
    insumo = crear_insumo()
    lote = crear_lote(insumo["id"], codigo="L-MOD-FEC", fecha=en_dias(20))

    res = client.put(
        f"/lotes-insumo/{lote['id']}",
        json={"fecha_vencimiento": en_dias(-1)},
    )

    assert res.status_code == 400
    assert "vencimiento" in res.json()["detail"].lower()