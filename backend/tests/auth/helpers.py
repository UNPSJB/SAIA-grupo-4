# Utilidades compartidas por los tests de autenticación. Se crean personas
# con contraseña y se inicia sesión contra POST /auth/token.

# El hash argon2 es costoso: se computa una sola vez por corrida y se reutiliza.

import random

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.utils import get_password_hash
from src.capacidades.models import Capacidad
from src.capacidades.services import inicializar_capacidades_sistema
from src.personal.models import Persona, PersonaCapacidad

ADMIN_PASSWORD = "admin123"
OPERADOR_PASSWORD = "op123456"
NUEVA_PASSWORD = "nueva123"

HASH_ADMIN = get_password_hash(ADMIN_PASSWORD)
HASH_OPERADOR = get_password_hash(OPERADOR_PASSWORD)

# Inicializa las capacidades de sistema y las devuelve indexadas por nombre.
def capacidades_sistema(db: Session) -> dict[str, Capacidad]:
    inicializar_capacidades_sistema(db)
    return {cap.nombre: cap for cap in db.scalars(select(Capacidad)).all()}

# Capacidad no habilitante (no permite iniciar sesión ni exige contraseña).
def crear_capacidad_personalizada(db: Session, nombre: str) -> Capacidad:
    capacidad = Capacidad(nombre=nombre, descripcion="Capacidad de prueba", activo=True)
    db.add(capacidad)
    db.commit()
    db.refresh(capacidad)
    return capacidad

# Crea una persona directamente en la DB, salteando las reglas del servicio.
def crear_persona(
    db: Session,
    nombre: str,
    dni: str,
    capacidad: Capacidad | None = None,
    password_hash: str | None = None,
    activo: bool = True,
) -> Persona:
    persona = Persona(
        nombre=nombre,
        apellido="Testing",
        dni=dni,
        legajo=int(dni),
        activo=activo,
        password_hash=password_hash,
    )
    db.add(persona)
    db.flush()
    if capacidad is not None:
        db.add(PersonaCapacidad(persona_id=persona.id, capacidad_id=capacidad.id, activo=True))
    db.commit()
    db.refresh(persona)
    return persona

# Login real (endpoint público) y devuelve el access token; falla si no es 200.
def iniciar_sesion(cliente: TestClient, dni: str, password: str) -> str:
    res = cliente.post("/auth/token", data={"username": dni, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def dni_unico() -> str:
    return str(random.randint(10_000_000, 99_999_999))
