# Tests de las reglas de contraseña en el alta/edición de personal.

# Se verifica que las capacidades habilitantes exijan contraseña y que el resto del
# personal no pueda tenerla.

import uuid

from fastapi.testclient import TestClient

from src.capacidades.constants import RolesSistema
from src.main import app
from src.personal.constants import ErrorCode as PersonalErrorCode
from tests.auth import helpers

# Crea una capacidad personalizada (no habilitante) y devuelve su id.
def _custom(admin_client):
    res = admin_client.post("/capacidades/", json={"nombre": f"Cap {uuid.uuid4().hex[:8]}"})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_alta_administrar_sin_password_400(admin_client, capacidades):
    res = admin_client.post("/personal/", json={
        "nombre": "Sin", "apellido": "Pass",
        "dni": helpers.dni_unico(), "legajo": int(helpers.dni_unico()),
        "capacidades_ids": [capacidades[RolesSistema.ADMINISTRAR].id],
    })

    assert res.status_code == 400
    assert res.json()["detail"] == PersonalErrorCode.PASSWORD_REQUERIDA


def test_alta_operar_con_password_201_y_login(admin_client, capacidades):
    dni = helpers.dni_unico()
    res = admin_client.post("/personal/", json={
        "nombre": "Con", "apellido": "Pass",
        "dni": dni, "legajo": int(dni),
        "capacidades_ids": [capacidades[RolesSistema.OPERAR].id],
        "password": helpers.OPERADOR_PASSWORD,
    })

    assert res.status_code == 201, res.text
    assert res.json()["tiene_password"] is True

    nuevo = TestClient(app)
    assert helpers.iniciar_sesion(nuevo, dni, helpers.OPERADOR_PASSWORD)


def test_alta_capacidad_custom_con_password_400(admin_client):
    res = admin_client.post("/personal/", json={
        "nombre": "Custom", "apellido": "Pass",
        "dni": helpers.dni_unico(), "legajo": int(helpers.dni_unico()),
        "capacidades_ids": [_custom(admin_client)],
        "password": helpers.OPERADOR_PASSWORD,
    })

    assert res.status_code == 400
    assert res.json()["detail"] == PersonalErrorCode.PASSWORD_NO_PERMITIDA


def test_edicion_otorga_operar_sin_password_400(admin_client, capacidades):
    cap_custom = _custom(admin_client)
    dni = helpers.dni_unico()
    alta = admin_client.post("/personal/", json={
        "nombre": "Ed", "apellido": "Uno",
        "dni": dni, "legajo": int(dni),
        "capacidades_ids": [cap_custom],
    })
    assert alta.status_code == 201, alta.text
    persona_id = alta.json()["id"]

    res = admin_client.put(f"/personal/{persona_id}", json={
        "capacidades_ids": [cap_custom, capacidades[RolesSistema.OPERAR].id],
    })

    assert res.status_code == 400
    assert res.json()["detail"] == PersonalErrorCode.PASSWORD_REQUERIDA


def test_edicion_otorga_operar_con_password_200_y_login(admin_client, capacidades):
    cap_custom = _custom(admin_client)
    dni = helpers.dni_unico()
    alta = admin_client.post("/personal/", json={
        "nombre": "Ed", "apellido": "Dos",
        "dni": dni, "legajo": int(dni),
        "capacidades_ids": [cap_custom],
    })
    persona_id = alta.json()["id"]

    res = admin_client.put(f"/personal/{persona_id}", json={
        "capacidades_ids": [cap_custom, capacidades[RolesSistema.OPERAR].id],
        "password": helpers.NUEVA_PASSWORD,
    })

    assert res.status_code == 200, res.text
    assert res.json()["tiene_password"] is True

    nuevo = TestClient(app)
    assert helpers.iniciar_sesion(nuevo, dni, helpers.NUEVA_PASSWORD)


def test_edicion_quita_habilitante_con_password_400(admin_client, capacidades):
    cap_custom = _custom(admin_client)
    dni = helpers.dni_unico()
    alta = admin_client.post("/personal/", json={
        "nombre": "Ed", "apellido": "Tres",
        "dni": dni, "legajo": int(dni),
        "capacidades_ids": [capacidades[RolesSistema.OPERAR].id],
        "password": helpers.OPERADOR_PASSWORD,
    })
    assert alta.status_code == 201, alta.text
    persona_id = alta.json()["id"]

    res = admin_client.put(f"/personal/{persona_id}", json={
        "capacidades_ids": [cap_custom],
        "password": helpers.NUEVA_PASSWORD,
    })

    assert res.status_code == 400
    assert res.json()["detail"] == PersonalErrorCode.PASSWORD_NO_PERMITIDA


def test_persona_no_expone_hash(admin_client, capacidades):
    dni = helpers.dni_unico()
    res = admin_client.post("/personal/", json={
        "nombre": "Hash", "apellido": "Oculto",
        "dni": dni, "legajo": int(dni),
        "capacidades_ids": [capacidades[RolesSistema.ADMINISTRAR].id],
        "password": helpers.ADMIN_PASSWORD,
    })

    assert res.status_code == 201, res.text
    assert "password_hash" not in res.text
    assert "password" not in res.json()

    listado = admin_client.get("/personal/")
    assert listado.status_code == 200
    assert "password_hash" not in listado.text
