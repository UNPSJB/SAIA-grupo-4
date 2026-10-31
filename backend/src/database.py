from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from src.utils.busqueda import normalizar
from src.config import settings


engine = create_engine(settings.DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Registra normalizar() como función SQL en cada conexión SQLite nueva
# (se usa en la búsqueda sin mayúsculas ni acentos). Se escucha en la clase
# Engine para que también aplique a engines propios, como los de los tests.
@event.listens_for(Engine, "connect")
def _registrar_funciones_sqlite(dbapi_conn, _):
    if dbapi_conn.__class__.__module__.startswith("sqlite3"):
        dbapi_conn.create_function("normalizar", 1, normalizar, deterministic=True)


# Dependency
def get_db():
    db = SessionLocal()
    # Para usar restricciones de FK en SQLite, debemos habilitar la siguiente opción:
    db.execute(text("PRAGMA foreign_keys = ON"))
    try:
        yield db
    finally:
        db.close()