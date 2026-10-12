from datetime import date, timedelta
from fastapi.testclient import TestClient
from src.main import app
from src.personal.constants import Constantes, EstadoVencimiento
from src.personal.services import calcular_estado_vencimiento
from tests.database import session

client = TestClient(app)


def crear_persona() -> int:
    cap_id = client.post("/capacidades/", json={"nombre": "CapAux"}).json()["id"]
    res = client.post(
        "/personal/",
        json={"nombre": "Juan", "apellido": "Perez", "dni": "30111222", "legajo": 1001, "capacidades_ids": [cap_id]},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def crear_documento(nombre: str = "Carnet de manipulador") -> int:
    res = client.post("/documentos-personal/", json={"nombre": nombre, "vigencia_dias": 365})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_crear_vencimiento():
    persona_id, documento_id = crear_persona(), crear_documento()
    res = client.post(
        f"/personal/{persona_id}/vencimientos",
        json={"documento_id": documento_id, "fecha_emision": "2026-01-10", "fecha_vencimiento": "2027-01-10"},
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["persona_id"] == persona_id
    assert data["fecha_vencimiento"] == "2027-01-10"
    assert data["url_comprobante"] is None
    assert data["documento"]["nombre"] == "Carnet de manipulador"


def test_mas_de_un_tipo_de_vencimiento_por_persona():
    persona_id = crear_persona()
    for nombre in ("Carnet de manipulador", "Apto físico"):
        res = client.post(
            f"/personal/{persona_id}/vencimientos",
            json={"documento_id": crear_documento(nombre), "fecha_vencimiento": "2027-01-10"},
        )
        assert res.status_code == 201, res.text


def test_vencimiento_duplicado_para_el_mismo_documento():
    persona_id, documento_id = crear_persona(), crear_documento()
    payload = {"documento_id": documento_id, "fecha_vencimiento": "2027-01-10"}
    assert client.post(f"/personal/{persona_id}/vencimientos", json=payload).status_code == 201
    res = client.post(f"/personal/{persona_id}/vencimientos", json=payload)
    assert res.status_code == 409
    assert res.json()["detail"] == "La persona ya tiene un vencimiento cargado para ese documento."


def test_vencimiento_con_persona_o_documento_inexistente():
    persona_id, documento_id = crear_persona(), crear_documento()
    payload = {"documento_id": documento_id, "fecha_vencimiento": "2027-01-10"}
    assert client.post("/personal/999/vencimientos", json=payload).status_code == 404
    payload["documento_id"] = 999
    assert client.post(f"/personal/{persona_id}/vencimientos", json=payload).status_code == 404


def test_vencimiento_con_documento_dado_de_baja():
    persona_id, documento_id = crear_persona(), crear_documento()
    assert client.delete(f"/documentos-personal/{documento_id}").status_code == 200
    res = client.post(f"/personal/{persona_id}/vencimientos", json={"documento_id": documento_id, "fecha_vencimiento": "2027-01-10"})
    assert res.status_code == 409
    assert res.json()["detail"] == "El documento de personal está dado de baja."


def test_vencimiento_con_persona_dada_de_baja():
    persona_id, documento_id = crear_persona(), crear_documento()
    res = client.delete(f"/personal/{persona_id}")
    assert res.status_code == 200, res.text
    res = client.post(f"/personal/{persona_id}/vencimientos", json={"documento_id": documento_id, "fecha_vencimiento": "2027-01-10"})
    assert res.status_code == 409


def crear_vencimiento(persona_id: int, documento_id: int) -> dict:
    res = client.post(
        f"/personal/{persona_id}/vencimientos",
        json={"documento_id": documento_id, "fecha_emision": "2026-01-10", "fecha_vencimiento": "2027-01-10"},
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_la_persona_incluye_sus_vencimientos():
    persona_id = crear_persona()
    assert client.get(f"/personal/{persona_id}").json()["vencimientos"] == []

    vencimiento = crear_vencimiento(persona_id, crear_documento())
    assert client.get(f"/personal/{persona_id}").json()["vencimientos"] == [vencimiento]
    # El listado incluye también a la persona admin que carga la suite
    persona = next(p for p in client.get("/personal/").json() if p["id"] == persona_id)
    # En el listado cada vencimiento suma sus días restantes y su estado calculado
    dias_restantes = (date(2027, 1, 10) - date.today()).days
    assert persona["vencimientos"] == [{**vencimiento, "dias_restantes": dias_restantes, "estado": "vigente"}]


# Listado de personal: GET /personal/ con vencimientos activos, estado y filtros

def test_listado_de_personal_incluye_vencimientos_activos_con_estado_y_por_urgencia():
    persona_id = crear_persona()
    documentos = {}
    for nombre, dias in (("Apto físico", 40), ("Carnet de manipulador", -5), ("Libreta sanitaria", 10), ("Curso BPM", -30)):
        documentos[nombre] = crear_documento(nombre)
        fecha = (date.today() + timedelta(days=dias)).isoformat()
        res = client.post(f"/personal/{persona_id}/vencimientos", json={"documento_id": documentos[nombre], "fecha_vencimiento": fecha})
        assert res.status_code == 201, res.text

    # El vencimiento de un documento dado de baja no se lista
    assert client.delete(f"/documentos-personal/{documentos['Curso BPM']}").status_code == 200

    persona = next(p for p in client.get("/personal/").json() if p["id"] == persona_id)
    assert [(v["documento"]["nombre"], v["dias_restantes"], v["estado"]) for v in persona["vencimientos"]] == [
        ("Carnet de manipulador", -5, "vencido"),
        ("Libreta sanitaria", 10, "proximo"),
        ("Apto físico", 40, "vigente"),
    ]


def test_listado_de_personal_filtra_por_persona():
    persona_id = crear_persona()
    # Coincidencia parcial y sin distinguir mayúsculas, en apellido, nombre o DNI
    for busqueda in ("pere", "JUAN", "30111"):
        data = client.get("/personal/", params={"busqueda": busqueda}).json()
        assert [p["id"] for p in data] == [persona_id]
    assert client.get("/personal/", params={"busqueda": "inexistente"}).json() == []


def test_listado_de_personal_filtra_por_tipo_de_vencimiento():
    persona_id = crear_persona()
    documento_id, otro_documento_id = crear_documento(), crear_documento("Apto físico")
    crear_vencimiento(persona_id, documento_id)

    # La persona admin de la suite no tiene vencimientos: queda fuera del filtro
    data = client.get("/personal/", params={"documento_id": documento_id}).json()
    assert [p["id"] for p in data] == [persona_id]
    assert client.get("/personal/", params={"documento_id": otro_documento_id}).json() == []

    # Los filtros se combinan
    assert client.get("/personal/", params={"documento_id": documento_id, "busqueda": "inexistente"}).json() == []


def test_listado_de_personal_filtra_por_estado():
    persona_id = crear_persona()
    for nombre, dias in (("Carnet de manipulador", -5), ("Apto físico", 40)):
        fecha = (date.today() + timedelta(days=dias)).isoformat()
        res = client.post(f"/personal/{persona_id}/vencimientos", json={"documento_id": crear_documento(nombre), "fecha_vencimiento": fecha})
        assert res.status_code == 201, res.text

    # Alcanza con que la persona tenga un vencimiento en ese estado
    for estado in ("vencido", "vigente"):
        data = client.get("/personal/", params={"estado": estado}).json()
        assert [p["id"] for p in data] == [persona_id]
        # La persona se lista con todos sus vencimientos, no solo los del estado pedido
        assert [v["estado"] for v in data[0]["vencimientos"]] == ["vencido", "vigente"]
    assert client.get("/personal/", params={"estado": "proximo"}).json() == []
    assert client.get("/personal/", params={"estado": "cualquiera"}).status_code == 422


def test_renovar_vencimiento():
    persona_id = crear_persona()
    vencimiento = crear_vencimiento(persona_id, crear_documento())
    url = f"/personal/{persona_id}/vencimientos/{vencimiento['id']}"

    res = client.patch(url, json={"fecha_emision": "2027-01-05", "fecha_vencimiento": "2028-01-05"})
    assert res.status_code == 200, res.text
    assert res.json()["fecha_emision"] == "2027-01-05"
    assert res.json()["fecha_vencimiento"] == "2028-01-05"

    # Editar un solo campo no toca los demas
    res = client.patch(url, json={"fecha_vencimiento": "2028-06-01"})
    assert res.status_code == 200, res.text
    assert res.json()["fecha_emision"] == "2027-01-05"
    assert res.json()["fecha_vencimiento"] == "2028-06-01"


def test_modificar_vencimiento_inexistente_o_de_otra_persona():
    persona_id = crear_persona()
    vencimiento = crear_vencimiento(persona_id, crear_documento())
    payload = {"fecha_vencimiento": "2028-01-05"}
    assert client.patch(f"/personal/{persona_id}/vencimientos/999", json=payload).status_code == 404
    assert client.patch(f"/personal/999/vencimientos/{vencimiento['id']}", json=payload).status_code == 404


def test_modificar_vencimiento_sin_fecha_de_vencimiento():
    persona_id = crear_persona()
    vencimiento = crear_vencimiento(persona_id, crear_documento())
    res = client.patch(f"/personal/{persona_id}/vencimientos/{vencimiento['id']}", json={"fecha_vencimiento": None})
    assert res.status_code == 400
    assert res.json()["detail"] == "La fecha de vencimiento es obligatoria."


def test_modificar_vencimiento_valida_contra_las_fechas_guardadas():
    persona_id = crear_persona()
    vencimiento = crear_vencimiento(persona_id, crear_documento())  # emision 2026-01-10, vencimiento 2027-01-10
    url = f"/personal/{persona_id}/vencimientos/{vencimiento['id']}"

    # Solo emision, posterior o igual al vencimiento guardado
    for emision in ("2027-06-01", "2027-01-10"):
        res = client.patch(url, json={"fecha_emision": emision})
        assert res.status_code == 400, res.text
        assert res.json()["detail"] == "La fecha de emisión debe ser anterior a la fecha de vencimiento."

    # Solo vencimiento, anterior a la emision guardada
    assert client.patch(url, json={"fecha_vencimiento": "2025-12-31"}).status_code == 400

    # Sin emision no hay nada que comparar
    assert client.patch(url, json={"fecha_emision": None, "fecha_vencimiento": "2025-12-31"}).status_code == 200


def test_adjuntar_comprobante():
    persona_id = crear_persona()
    vencimiento = crear_vencimiento(persona_id, crear_documento())
    url = f"/personal/{persona_id}/vencimientos/{vencimiento['id']}/comprobante"

    # El nombre original no se usa: no puede salir de la carpeta de comprobantes
    res = client.post(url, files={"comprobante": ("../../carnet.pdf", b"%PDF-1.4 contenido", "application/pdf")})
    assert res.status_code == 200, res.text
    ruta = res.json()["url_comprobante"]
    assert ruta.startswith(f"uploads/comprobantes/vencimiento_{vencimiento['id']}_")
    assert ruta.endswith(".pdf")
    assert ".." not in ruta

    # El archivo queda accesible desde la carpeta de estaticos
    assert client.get(f"/{ruta}").content == b"%PDF-1.4 contenido"


def test_adjuntar_comprobante_con_tipo_no_permitido():
    persona_id = crear_persona()
    vencimiento = crear_vencimiento(persona_id, crear_documento())
    res = client.post(
        f"/personal/{persona_id}/vencimientos/{vencimiento['id']}/comprobante",
        files={"comprobante": ("notas.txt", b"hola", "text/plain")},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "El comprobante debe ser una imagen JPG o PNG, o un archivo PDF."


def test_adjuntar_comprobante_a_vencimiento_inexistente():
    persona_id = crear_persona()
    res = client.post(
        f"/personal/{persona_id}/vencimientos/999/comprobante",
        files={"comprobante": ("carnet.pdf", b"%PDF", "application/pdf")},
    )
    assert res.status_code == 404


def test_fechas_invalidas():
    persona_id, documento_id = crear_persona(), crear_documento()
    url = f"/personal/{persona_id}/vencimientos"
    # Fecha inexistente
    assert client.post(url, json={"documento_id": documento_id, "fecha_vencimiento": "2027-02-30"}).status_code == 422
    # Sin fecha de vencimiento
    assert client.post(url, json={"documento_id": documento_id}).status_code == 422
    # Emisión posterior o igual al vencimiento
    for emision in ("2027-06-01", "2027-01-10"):
        res = client.post(url, json={"documento_id": documento_id, "fecha_emision": emision, "fecha_vencimiento": "2027-01-10"})
        assert res.status_code == 422


# Regla de semaforización (función pura, sin base de datos)

def test_calcular_estado_vencimiento_vencido():
    dias, estado = calcular_estado_vencimiento(date(2026, 1, 10), date(2026, 1, 11))
    assert dias == -1
    assert estado == EstadoVencimiento.VENCIDO


def test_calcular_estado_vencimiento_vence_hoy_es_proximo():
    dias, estado = calcular_estado_vencimiento(date(2026, 1, 10), date(2026, 1, 10))
    assert dias == 0
    assert estado == EstadoVencimiento.PROXIMO


def test_calcular_estado_vencimiento_limite_proximo():
    hoy = date(2026, 1, 10) - timedelta(days=Constantes.DIAS_AVISO_PROXIMO)
    _, estado = calcular_estado_vencimiento(date(2026, 1, 10), hoy)
    assert estado == EstadoVencimiento.PROXIMO


def test_calcular_estado_vencimiento_vigente():
    hoy = date(2026, 1, 10) - timedelta(days=Constantes.DIAS_AVISO_PROXIMO + 1)
    _, estado = calcular_estado_vencimiento(date(2026, 1, 10), hoy)
    assert estado == EstadoVencimiento.VIGENTE


# Vista consolidada: GET /vencimientos/?categoria=personal

def vence_en(dias: int) -> str:
    return (date.today() + timedelta(days=dias)).isoformat()


def test_vencimientos_de_personal_ordenados_por_urgencia():
    persona_id = crear_persona()
    for nombre, dias in (("Apto físico", 40), ("Carnet de manipulador", -5), ("Libreta sanitaria", 10)):
        res = client.post(
            f"/personal/{persona_id}/vencimientos",
            json={"documento_id": crear_documento(nombre), "fecha_vencimiento": vence_en(dias)},
        )
        assert res.status_code == 201, res.text

    data = client.get("/vencimientos/", params={"categoria": "personal"}).json()
    assert [v["dias_restantes"] for v in data] == [-5, 10, 40]
    assert [v["estado"] for v in data] == ["vencido", "proximo", "vigente"]
    assert data[0]["concepto"] == "Perez, Juan - Carnet de manipulador"
    assert data[0]["entidad_id"] == persona_id
    assert data[0]["detalle"] == "Carnet de manipulador"


def test_vencimientos_de_personal_excluye_documento_o_persona_dados_de_baja():
    persona_id = crear_persona()
    documento_id, otro_documento_id = crear_documento(), crear_documento("Apto físico")
    for doc_id in (documento_id, otro_documento_id):
        res = client.post(f"/personal/{persona_id}/vencimientos", json={"documento_id": doc_id, "fecha_vencimiento": vence_en(-5)})
        assert res.status_code == 201, res.text

    assert client.delete(f"/documentos-personal/{documento_id}").status_code == 200
    data = client.get("/vencimientos/", params={"categoria": "personal"}).json()
    assert [v["detalle"] for v in data] == ["Apto físico"]

    assert client.delete(f"/personal/{persona_id}").status_code == 200
    assert client.get("/vencimientos/", params={"categoria": "personal"}).json() == []


# Campanita: GET /vencimientos/ acotado a vencidos y próximos

def test_la_campanita_incluye_los_vencimientos_criticos_de_personal():
    persona_id = crear_persona()
    ids = {}
    for nombre, dias in (("Apto físico", 40), ("Carnet de manipulador", -5), ("Libreta sanitaria", 10)):
        res = client.post(
            f"/personal/{persona_id}/vencimientos",
            json={"documento_id": crear_documento(nombre), "fecha_vencimiento": vence_en(dias)},
        )
        assert res.status_code == 201, res.text
        ids[nombre] = res.json()["id"]

    url = f"/vencimientos/?estado=por_vencer&dias_max={Constantes.DIAS_AVISO_PROXIMO}"
    data = client.get(url).json()
    assert [(v["concepto"], v["estado"]) for v in data] == [
        ("Perez, Juan - Carnet de manipulador", "vencido"),
        ("Perez, Juan - Libreta sanitaria", "proximo"),
    ]
    assert data[0]["categoria"] == "personal"
    assert data[0]["entidad_id"] == persona_id

    # Al renovar, la alerta desaparece
    res = client.patch(f"/personal/{persona_id}/vencimientos/{ids['Carnet de manipulador']}", json={"fecha_vencimiento": vence_en(365)})
    assert res.status_code == 200, res.text
    assert [v["concepto"] for v in client.get(url).json()] == ["Perez, Juan - Libreta sanitaria"]
