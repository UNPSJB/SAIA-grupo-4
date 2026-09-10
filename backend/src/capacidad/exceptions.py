from src.capacidad.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


# Excepciones para Capacidad
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class CapacidadNoExiste(NotFound):
    DETAIL = ErrorCode.CAPACIDAD_NO_EXISTE

class PersonaCapacidadNoEncontrada(NotFound):
    DETAIL = ErrorCode.PERSONA_CAPACIDAD_NO_ENCONTRADA
