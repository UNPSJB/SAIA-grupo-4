from src.incidentes.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

class ReportanteNoAsignado(BadRequest):
    DETAIL = ErrorCode.REPORTANTE_NO_ASIGNADO

class ReportanteNoEncontrado(NotFound):
    DETAIL = ErrorCode.REPORTANTE_NO_ENCONTRADO

# Agregar acá las excepciones