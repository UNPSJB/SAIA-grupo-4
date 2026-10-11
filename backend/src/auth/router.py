"""Endpoints de autenticación (prefijo /auth).

Flujo de sesión:
1. POST /auth/token  → login con DNI + contraseña (form OAuth2). Devuelve el
   access token en el body y setea la cookie de refresh (httpOnly).
2. PUT /auth/token   → renueva ambos tokens usando la cookie de refresh.
3. DELETE /auth/token → logout (elimina la cookie).
4. GET /auth/me      → persona autenticada (requiere el header Authorization).
"""
from fastapi import APIRouter, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from src.auth import dependencies, schemas, services
from src.auth.utils import (
    create_access_token,
    create_refresh_token,
    get_delete_cookie_settings,
    get_refresh_cookie_settings,
)
from src.database import get_db
from src.personal.models import Persona

router = APIRouter(prefix="/auth", tags=["auth"])


# Login: valida DNI (username) + contraseña y crea la sesión.
# En éxito devuelve el access token y los datos de la persona, y setea la
# cookie de refresh. Si las credenciales no valen o la persona no tiene
# capacidades habilitantes, responde 401.
@router.post("/token", response_model=schemas.Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> schemas.Token:
    persona = services.authenticate_user(db, form_data.username, form_data.password)
    response.set_cookie(**get_refresh_cookie_settings(create_refresh_token(persona.id)))
    return schemas.Token(access_token=create_access_token(persona.id), persona=persona)

# Renueva el access token a partir del refresh token (cookie httpOnly).
@router.put("/token", response_model=schemas.Token)
def refresh_tokens(
    response: Response,
    db: Session = Depends(get_db),
    persona: Persona = Depends(dependencies.get_refresh_user),
) -> schemas.Token:
    response.set_cookie(**get_refresh_cookie_settings(create_refresh_token(persona.id)))
    return schemas.Token(access_token=create_access_token(persona.id), persona=persona)

# Cierra la sesión eliminando la cookie de refresh.
@router.delete("/token")
def logout(response: Response) -> dict:
    response.delete_cookie(**get_delete_cookie_settings())
    return {"msg": "La sesión se ha cerrado exitosamente."}

# Devuelve la persona autenticada (requiere Authorization: Bearer).
@router.get("/me", response_model=schemas.Persona)
def leer_persona_actual(
    persona: Persona = Depends(dependencies.get_current_user),
) -> Persona:
    return persona
