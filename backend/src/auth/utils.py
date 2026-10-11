"""Utilidades criptográficas del módulo auth.

- Hash de contraseñas con argon2 (pwdlib con el algoritmo recomendado).
- Creación de JWT (access y refresh) con PyJWT.
- Configuración de la cookie httpOnly que transporta el refresh token.
"""

import jwt
from datetime import UTC, datetime, timedelta
from typing import Any, Dict
from pwdlib import PasswordHash
from src.config import settings

# Argon2 es el hash recomendado por pwdlib (memory-hard y resistente a GPU).
password_hasher = PasswordHash.recommended()

# Hashea la contraseña en claro para poder persistirla.
def get_password_hash(password: str) -> str:
    return password_hasher.hash(password)

# Verifica una contraseña en claro contra su hash guardado.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hasher.verify(plain_password, hashed_password)

# Firma un JWT con los datos recibidos y fecha de expiración.
def encode_token(data: Dict[str, Any], expires_delta: timedelta, key: str) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now(UTC) + expires_delta})
    return jwt.encode(to_encode, key, algorithm=settings.ALGORITHM)

# Access token de corta duración: se firma con SECRET_KEY y se devuelve en el body del response para que el frontend lo mande como Bearer.
def create_access_token(persona_id: int) -> str:
    return encode_token(
        data={"sub": str(persona_id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        key=settings.SECRET_KEY,
    )

# Refresh token de larga duración: se firma con REFRESH_SECRET_KEY y viaja solo en la cookie httpOnly (el JavaScript del frontend nunca lo lee).
def create_refresh_token(persona_id: int) -> str:
    return encode_token(
        data={"sub": str(persona_id)},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        key=settings.REFRESH_SECRET_KEY,
    )

# Atributos de la cookie de refresh: httpOnly (inaccesible desde JS), samesite=lax y sin domain (host-only, aplica a localhost:8000).
def get_refresh_cookie_settings(token: str) -> Dict[str, Any]:
    return {
        "key": settings.REFRESH_TOKEN_COOKIE_NAME,
        "value": token,
        "httponly": True,
        "samesite": "lax",
        "secure": settings.SECURE_COOKIES,
        "path": "/",
        "max_age": settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    }

# Atributos para eliminar la cookie de refresh en el logout.
def get_delete_cookie_settings() -> Dict[str, Any]:
    return {"key": settings.REFRESH_TOKEN_COOKIE_NAME, "path": "/"}
