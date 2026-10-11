"""Dependencias de FastAPI para autenticación (quién es) y autorización (qué puede).

- get_current_user / get_refresh_user: resuelven la persona a partir del
  access token (header Authorization) o del refresh token (cookie httpOnly).
- requiere_administracion / requiere_operacion: dependencias de autorización
  por capacidades, pensadas para aplicarse en los routers del backend.
"""
import jwt
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from src.auth import exceptions, services
from src.capacidades.constants import RolesSistema
from src.config import settings
from src.database import get_db
from src.exceptions import PermissionDenied
from src.personal.models import Persona

# Extrae el Bearer token del header Authorization. Si no viene, responde 401.
# tokenUrl apunta al endpoint de login y habilita el botón "Authorize" en /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=settings.TOKEN_URL)

# Lee el refresh token desde la cookie httpOnly; si no existe, 401.
def get_token_from_cookie(request: Request) -> str:
    token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not token:
        raise exceptions.SesionNoValida()
    return token

# Decodifica un JWT y devuelve el id de la persona (claim "sub").
# Cualquier problema (firma inválida, expirado, sub ausente o no numérico)
# se traduce en un 401 SesionNoValida.
def _decode_persona_id(token: str, key: str) -> int:
    try:
        payload = jwt.decode(token, key, algorithms=[settings.ALGORITHM])
    except InvalidTokenError:
        raise exceptions.SesionNoValida()
    sub = payload.get("sub")
    if sub is None:
        raise exceptions.SesionNoValida()
    try:
        return int(sub)
    except (TypeError, ValueError):
        raise exceptions.SesionNoValida()

# Trae la persona desde la DB y valida que pueda tener sesión activa:
# debe existir, estar activa y tener vigente una capacidad habilitante
# (si un admin le quitó administrar/operar, la sesión muere en el próximo request).
def _cargar_persona(db: Session, persona_id: int) -> Persona:
    persona = db.get(Persona, persona_id)
    if persona is None or not persona.activo:
        raise exceptions.SesionNoValida()
    if not services.tiene_capacidad_habilitante(db, persona):
        raise exceptions.CapacidadesNoHabilitadas()
    return persona

# Persona autenticada a partir del access token (header Authorization).
async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> Persona:
    persona_id = _decode_persona_id(token, settings.SECRET_KEY)
    return _cargar_persona(db, persona_id)

# Persona autenticada a partir del refresh token (cookie httpOnly).
async def get_refresh_user(
    db: Session = Depends(get_db),
    token: str = Depends(get_token_from_cookie),
) -> Persona:
    persona_id = _decode_persona_id(token, settings.REFRESH_SECRET_KEY)
    return _cargar_persona(db, persona_id)

# Autorización: exige la capacidad 'administrar' vigente (403 si no).
async def requiere_administracion(
    persona: Persona = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Persona:
    activas = services.nombres_capacidades_activas(db, persona.id)
    if RolesSistema.ADMINISTRAR not in activas:
        raise PermissionDenied()
    return persona

# Autorización: exige 'administrar' u 'operar' vigente (403 si no).
async def requiere_operacion(
    persona: Persona = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Persona:
    activas = services.nombres_capacidades_activas(db, persona.id)
    if not activas & {RolesSistema.ADMINISTRAR, RolesSistema.OPERAR}:
        raise PermissionDenied()
    return persona
