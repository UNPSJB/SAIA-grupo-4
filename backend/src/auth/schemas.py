from pydantic import BaseModel
from src.personal.schemas import Persona

class Token(BaseModel):
    """Respuesta del login (POST /auth/token) y del refresh (PUT /auth/token).

    - access_token: JWT de corta duración que el frontend envía en el header
      Authorization: Bearer.
    - persona: datos completos de la persona autenticada (incluye sus
      capacidades activas y tiene_password), para que el cliente no necesite
      llamadas adicionales al iniciar sesión.
    """
    access_token: str
    token_type: str = "bearer"
    persona: Persona
