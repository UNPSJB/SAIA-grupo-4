# Fixtures de los tests de autenticación.

import pytest
from fastapi.testclient import TestClient

from src.auth.dependencies import get_current_user
from src.capacidades.constants import RolesSistema
from src.main import app
from tests.auth import helpers
from tests.database import session  # noqa: F401  (fixture autouse de la suite)

# Quita el override admin de tests/database.py: acá vale la auth real.
@pytest.fixture(autouse=True)
def sin_override(session):
    app.dependency_overrides.pop(get_current_user, None)
    yield

# Capacidades de sistema indexadas por nombre.
@pytest.fixture
def capacidades(session): 
    return helpers.capacidades_sistema(session)

# Cliente HTTP ya autenticado como administrador (token real).
@pytest.fixture
def admin_client(session, capacidades):
    helpers.crear_persona(
        session,
        "Admin",
        "11111111",
        capacidades[RolesSistema.ADMINISTRAR],
        password_hash=helpers.HASH_ADMIN,
    )
    cliente = TestClient(app)
    token = helpers.iniciar_sesion(cliente, "11111111", helpers.ADMIN_PASSWORD)
    cliente.headers.update(helpers.auth_headers(token))
    return cliente
