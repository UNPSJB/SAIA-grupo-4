# Tests de refresh (PUT /auth/token), logout (DELETE) y /auth/me.

from fastapi.testclient import TestClient
from sqlalchemy import select

from src.auth.constants import ErrorCode
from src.capacidades.constants import RolesSistema
from src.capacidades.models import Capacidad
from src.main import app
from src.personal.models import PersonaCapacidad
from tests.auth import helpers


def _admin(session, capacidades, dni="11111111"):
    return helpers.crear_persona(
        session, "Admin", dni,
        capacidades[RolesSistema.ADMINISTRAR], password_hash=helpers.HASH_ADMIN,
    )


def test_refresh_valido(session, capacidades):
    _admin(session, capacidades)
    cliente = TestClient(app)
    helpers.iniciar_sesion(cliente, "11111111", helpers.ADMIN_PASSWORD)

    res = cliente.put("/auth/token")
    assert res.status_code == 200, res.text
    nuevo = res.json()["access_token"]
    assert nuevo
    assert cliente.get("/auth/me", headers=helpers.auth_headers(nuevo)).status_code == 200


def test_refresh_sin_cookie_401():
    cliente = TestClient(app)
    res = cliente.put("/auth/token")

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.SESION_NO_VALIDA


def test_refresh_cookie_invalida_401():
    cliente = TestClient(app)
    cliente.cookies.set("refresh_token", "abc.def.ghi", domain="testserver")
    res = cliente.put("/auth/token")

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.SESION_NO_VALIDA


def test_logout_invalida_sesion(session, capacidades):
    _admin(session, capacidades)
    cliente = TestClient(app)
    helpers.iniciar_sesion(cliente, "11111111", helpers.ADMIN_PASSWORD)
    assert cliente.put("/auth/token").status_code == 200

    res = cliente.delete("/auth/token")
    assert res.status_code == 200
    # Tras el logout la cookie se borra y el refresh deja de servir.
    assert cliente.put("/auth/token").status_code == 401


def test_me_sin_token_401():
    cliente = TestClient(app)
    res = cliente.get("/auth/me")

    assert res.status_code == 401
    assert res.headers.get("www-authenticate") == "Bearer"


def test_me_con_token_ok(session, capacidades):
    _admin(session, capacidades)
    cliente = TestClient(app)
    token = helpers.iniciar_sesion(cliente, "11111111", helpers.ADMIN_PASSWORD)

    res = cliente.get("/auth/me", headers=helpers.auth_headers(token))
    assert res.status_code == 200
    assert res.json()["dni"] == "11111111"
    assert res.json()["tiene_password"] is True


def test_sesion_muere_al_perder_capacidad(session, capacidades):
    admin = _admin(session, capacidades)
    cliente = TestClient(app)
    token = helpers.iniciar_sesion(cliente, "11111111", helpers.ADMIN_PASSWORD)
    assert cliente.get("/personal/", headers=helpers.auth_headers(token)).status_code == 200

    asignacion = session.scalar(
        select(PersonaCapacidad)
        .join(Capacidad)
        .where(
            PersonaCapacidad.persona_id == admin.id,
            Capacidad.nombre == RolesSistema.ADMINISTRAR,
        )
    )
    asignacion.activo = False
    session.commit()

    res = cliente.get("/personal/", headers=helpers.auth_headers(token))
    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.CAPACIDADES_NO_HABILITADAS
