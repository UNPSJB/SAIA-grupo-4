from src.alimento_referencia.constants import ErrorCode
from src.exceptions import BadRequest, NotFound


class AlimentoReferenciaNoExiste(NotFound):
    DETAIL = ErrorCode.ALIMENTO_NO_EXISTE


class AlimentoReferenciaDuplicado(BadRequest):
    DETAIL = ErrorCode.ALIMENTO_DUPLICADO


class AlimentoOficialSaraNoModificable(BadRequest):
    DETAIL = ErrorCode.ALIMENTO_OFICIAL_PROTEGIDO


class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO
