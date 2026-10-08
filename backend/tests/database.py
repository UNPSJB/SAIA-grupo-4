import pytest
from typing import Generator
from sqlalchemy import StaticPool, create_engine, select, text
from sqlalchemy.orm import sessionmaker, Session
from src.main import app
from src.database import get_db
from src.config import settings
from src.models import ModeloBase

# Autenticacion para la suite: se importa get_current_user para pisarlo.
from src.auth.dependencies import get_current_user
from src.auth.utils import get_password_hash
from src.capacidades.constants import RolesSistema
from src.capacidades.models import Capacidad
from src.capacidades.services import inicializar_capacidades_sistema
from src.personal.models import Persona, PersonaCapacidad

# creamos una db para testing
engine = create_engine(
    settings.DB_URL_TEST,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    # utilizaremos esta funcion para "pisar" la que definimos en src/database.py.
    db = TestingSessionLocal()
    # Para usar restricciones de FK en SQLite, debemos habilitar la siguiente opción:
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        print("Using test DB!")
        yield db
    finally:
        db.close()

# forzamos a fastapi para que utilice la db para testing.
app.dependency_overrides[get_db] = override_get_db

# El hash argon2 es costoso: se computa UNA sola vez por corrida y se reutiliza
# en todos los tests (cada test recrea las tablas pero la persona admin vuelve
# a llevar esta misma contraseña).
_PASSWORD_ADMIN = "admin123"
_ADMIN_PASSWORD_HASH = get_password_hash(_PASSWORD_ADMIN)

# Holder mutable: la persona admin cambia en cada test (la DB se recrea por
# test), y el override la devuelve siempre.
_PERSONA_ADMIN = {"persona": None}


def _persona_admin_override() -> Persona | None:
    return _PERSONA_ADMIN["persona"]

#   Crea las capacidades de sistema y una persona admin activa con password.
def _preparar_persona_admin(db: Session) -> Persona:
    inicializar_capacidades_sistema(db)
    admin_cap = db.scalar(select(Capacidad).where(Capacidad.nombre == RolesSistema.ADMINISTRAR))
    admin = Persona(
        nombre="Admin", apellido="Sistema", dni="40000000", legajo=1000000,
        activo=True, password_hash=_ADMIN_PASSWORD_HASH,
    )
    db.add(admin)
    db.flush()
    db.add(PersonaCapacidad(persona_id=admin.id, capacidad_id=admin_cap.id, activo=True))
    db.commit()
    _PERSONA_ADMIN["persona"] = admin
    return admin

@pytest.fixture(autouse=True)
def session() -> Generator[Session, None, None]:
    # Creamos las tablas en la db de pruebas
    ModeloBase.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    # Para usar restricciones de FK en SQLite, debemos habilitar la siguiente opción:
    db.execute(text("PRAGMA foreign_keys = ON"))

    # Sesión de la suite: toda la app responde como esta persona admin.
    _preparar_persona_admin(db)
    app.dependency_overrides[get_current_user] = _persona_admin_override

    yield db

    app.dependency_overrides.pop(get_current_user, None)
    _PERSONA_ADMIN["persona"] = None
    db.close()
    ModeloBase.metadata.drop_all(bind=engine)
