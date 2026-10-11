"""Pruebas de la proteccion de rutas por capacidad (Fase 2).

A diferencia del resto de la suite (que corre como admin via override en
tests/database.py), aca se ejercita el flujo real: se crean personas admin y
operador con password y se autentican con POST /auth/token.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.auth.dependencies import get_current_user
from src.auth.utils import get_password_hash
from src.capacidades.constants import RolesSistema
from src.capacidades.models import Capacidad
from src.capacidades.services import inicializar_capacidades_sistema
from src.main import app
from src.personal.models import Persona, PersonaCapacidad
from tests.database import session  # noqa: F401  (sesion autouse)

client = TestClient(app)

# Un solo hash por rol (argon2 es costoso); se reutiliza en todos los tests.
ADMIN_PASSWORD = "admin123"
OPERADOR_PASSWORD = "op123456"
_ADMIN_HASH = get_password_hash(ADMIN_PASSWORD)
_OPERADOR_HASH = get_password_hash(OPERADOR_PASSWORD)


@pytest.fixture(autouse=True)
def sin_override(session):
    """Quita el override admin de tests/database.py: aca vale la auth real."""
    app.dependency_overrides.pop(get_current_user, None)
    yield


def _crear_persona(db, nombre: str, dni: str, cap: Capacidad, password: str) -> Persona:
    persona = Persona(
        nombre=nombre, apellido="Testing", dni=dni, legajo=int(dni),
        activo=True, password_hash=password,
    )
    db.add(persona)
    db.flush()
    db.add(PersonaCapacidad(persona_id=persona.id, capacidad_id=cap.id, activo=True))
    return persona


@pytest.fixture
def credenciales(session):
    """Personas admin y operador reales, listas para iniciar sesion."""
    inicializar_capacidades_sistema(session)
    admin_cap = session.scalar(select(Capacidad).where(Capacidad.nombre == RolesSistema.ADMINISTRAR))
    oper_cap = session.scalar(select(Capacidad).where(Capacidad.nombre == RolesSistema.OPERAR))

    _crear_persona(session, "Admin", "11111111", admin_cap, _ADMIN_HASH)
    _crear_persona(session, "Operador", "22222222", oper_cap, _OPERADOR_HASH)
    session.commit()

    return {
        "admin_dni": "11111111", "admin_password": ADMIN_PASSWORD,
        "operador_dni": "22222222", "operador_password": OPERADOR_PASSWORD,
    }


def _login(dni: str, password: str) -> str:
    """Login real (el endpoint /auth/token es publico) y devuelve el access token."""
    res = client.post("/auth/token", data={"username": dni, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_sin_token_es_401():
    assert client.get("/equipos/").status_code == 401
    assert client.get("/personal/").status_code == 401
    assert client.get("/checklists/hoy").status_code == 401
    res = client.get("/equipos/")
    assert res.status_code == 401
    assert res.headers.get("www-authenticate") == "Bearer"


def test_token_invalido_es_401():
    res = client.get("/equipos/", headers=_headers("abc.def.ghi"))
    assert res.status_code == 401


def test_admin_accede_a_gestion_y_checklists(credenciales):
    token = _login(credenciales["admin_dni"], credenciales["admin_password"])
    headers = _headers(token)
    assert client.get("/equipos/", headers=headers).status_code == 200
    assert client.get("/personal/", headers=headers).status_code == 200
    # requiere_operacion admite 'administrar': admin-solo tambien ve checklists.
    assert client.get("/checklists/hoy", headers=headers).status_code == 200


def test_operador_solo_checklists(credenciales):
    token = _login(credenciales["operador_dni"], credenciales["operador_password"])
    headers = _headers(token)

    assert client.get("/checklists/hoy", headers=headers).status_code == 200

    res = client.get("/equipos/", headers=headers)
    assert res.status_code == 403
    assert res.json()["detail"] == "Permiso denegado"
    assert client.get("/personal/", headers=headers).status_code == 403