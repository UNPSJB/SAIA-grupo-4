from src.recambios.constants import ErrorCode
from src.exceptions import BadRequest, Conflict


class ElementoInactivo(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_INACTIVO

class SinFrecuencia(BadRequest):
    DETAIL = ErrorCode.SIN_FRECUENCIA

class FechaFutura(BadRequest):
    DETAIL = ErrorCode.FECHA_FUTURA

class FechaAnterior(Conflict):
    DETAIL = ErrorCode.FECHA_ANTERIOR

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO
