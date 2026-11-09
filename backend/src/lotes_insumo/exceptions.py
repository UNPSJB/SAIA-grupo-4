from src.lotes_insumo.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


# Excepciones para LoteInsumo
class LoteNoExiste(NotFound):
    DETAIL = ErrorCode.LOTE_NO_EXISTE

class LoteBaja(BadRequest):
    DETAIL = ErrorCode.LOTE_BAJA

class InsumoNoDisponible(BadRequest):
    DETAIL = ErrorCode.INSUMO_NO_DISPONIBLE

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO