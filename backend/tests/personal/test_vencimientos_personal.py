from fastapi.testclient import TestClient
from src.main import app
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
    assert client.get("/personal/").json()[0]["vencimientos"] == [vencimiento]


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
