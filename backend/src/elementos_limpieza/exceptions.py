from src.elementos_limpieza.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class ElementoNoExiste(NotFound):
    DETAIL = ErrorCode.ELEMENTO_NO_EXISTE

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO

class ElementoActivo(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_ACTIVO

class ElementoBaja(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_BAJA

class TipoInvalido(BadRequest):
    DETAIL = ErrorCode.TIPO_INVALIDO

class UbicacionExclusiva(BadRequest):
    DETAIL = ErrorCode.UBICACION_EXCLUSIVA