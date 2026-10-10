# Tests del login real (POST /auth/token).

# Cada persona se crea con contraseña y se intenta iniciar sesión. Se verifican
# las dos respuestas 401 posibles y que el hash nunca se exponga.

from fastapi.testclient import TestClient

from src.auth.constants import ErrorCode
from src.capacidades.constants import RolesSistema
from src.main import app
from tests.auth import helpers


def _login(cliente, dni, password):
    return cliente.post("/auth/token", data={"username": dni, "password": password})


def test_login_admin_ok(session, capacidades):
    helpers.crear_persona(
        session, "Admin", "11111111",
        capacidades[RolesSistema.ADMINISTRAR], password_hash=helpers.HASH_ADMIN,
    )
    cliente = TestClient(app)
    res = _login(cliente, "11111111", helpers.ADMIN_PASSWORD)

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["persona"]["dni"] == "11111111"
    assert data["persona"]["tiene_password"] is True
    assert any(
        c["capacidad"]["nombre"] == RolesSistema.ADMINISTRAR
        for c in data["persona"]["capacidades"]
    )
    assert "refresh_token" in cliente.cookies


def test_login_operador_ok(session, capacidades):
    helpers.crear_persona(
        session, "Operador", "22222222",
        capacidades[RolesSistema.OPERAR], password_hash=helpers.HASH_OPERADOR,
    )
    cliente = TestClient(app)
    res = _login(cliente, "22222222", helpers.OPERADOR_PASSWORD)

    assert res.status_code == 200, res.text
    assert res.json()["persona"]["tiene_password"] is True


def test_login_dni_inexistente_401():
    cliente = TestClient(app)
    res = _login(cliente, "99999999", "cualquiera")

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.CREDENCIALES_INCORRECTAS
    assert res.headers.get("www-authenticate") == "Bearer"


def test_login_password_incorrecta_401(session, capacidades):
    helpers.crear_persona(
        session, "Admin", "11111111",
        capacidades[RolesSistema.ADMINISTRAR], password_hash=helpers.HASH_ADMIN,
    )
    cliente = TestClient(app)
    res = _login(cliente, "11111111", "incorrecta")

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.CREDENCIALES_INCORRECTAS


def test_login_persona_inactiva_401(session, capacidades):
    helpers.crear_persona(
        session, "Baja", "33333333",
        capacidades[RolesSistema.OPERAR], password_hash=helpers.HASH_OPERADOR,
        activo=False,
    )
    cliente = TestClient(app)
    res = _login(cliente, "33333333", helpers.OPERADOR_PASSWORD)

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.CREDENCIALES_INCORRECTAS


def test_login_persona_sin_password_401(session, capacidades):
    helpers.crear_persona(
        session, "SinPass", "44444444",
        capacidades[RolesSistema.OPERAR], password_hash=None,
    )
    cliente = TestClient(app)
    res = _login(cliente, "44444444", "loquesea")

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.CREDENCIALES_INCORRECTAS


def test_login_sin_capacidades_habilitantes_401(session):
    custom = helpers.crear_capacidad_personalizada(session, "Reportar incidentes")
    helpers.crear_persona(
        session, "Custom", "55555555", custom,
        password_hash=helpers.HASH_OPERADOR,
    )
    cliente = TestClient(app)
    res = _login(cliente, "55555555", helpers.OPERADOR_PASSWORD)

    assert res.status_code == 401
    assert res.json()["detail"] == ErrorCode.CAPACIDADES_NO_HABILITADAS


def test_login_no_expone_hash(session, capacidades):
    helpers.crear_persona(
        session, "Admin", "11111111",
        capacidades[RolesSistema.ADMINISTRAR], password_hash=helpers.HASH_ADMIN,
    )
    cliente = TestClient(app)
    res = _login(cliente, "11111111", helpers.ADMIN_PASSWORD)

    assert res.status_code == 200
    assert "password_hash" not in res.text
    assert "password" not in res.json()["persona"]
    assert res.json()["persona"]["tiene_password"] is True
