"""Excepciones 401 del módulo auth.

Todas heredan de NotAuthenticated (src/exceptions.py), que responde con
status 401 y el header WWW-Authenticate: Bearer, usando el DETAIL de
cada clase como mensaje.
"""
from src.auth.constants import ErrorCode
from src.exceptions import NotAuthenticated

# DNI inexistente, sin contraseña, contraseña incorrecta o persona dada de baja.
class CredencialesIncorrectas(NotAuthenticated): DETAIL = ErrorCode.CREDENCIALES_INCORRECTAS
# Password correcta pero sin capacidades vigentes de administrar u operar.
class CapacidadesNoHabilitadas(NotAuthenticated): DETAIL = ErrorCode.CAPACIDADES_NO_HABILITADAS
# Token inválido/expirado o persona inexistente: no hay sesión utilizable.
class SesionNoValida(NotAuthenticated): DETAIL = ErrorCode.SESION_NO_VALIDA
