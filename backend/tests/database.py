import pytest
from typing import Generator
from sqlalchemy import StaticPool, create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from src.main import app
from src.database import get_db
from src.config import settings
from src.models import ModeloBase

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

@pytest.fixture(autouse=True)
def session() -> Generator[Session, None, None]:
    # Creamos las tablas en la db de pruebas
    ModeloBase.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    # Para usar restricciones de FK en SQLite, debemos habilitar la siguiente opción:
    db.execute(text("PRAGMA foreign_keys = ON"))

    yield db

    db.close()
    ModeloBase.metadata.drop_all(bind=engine)
