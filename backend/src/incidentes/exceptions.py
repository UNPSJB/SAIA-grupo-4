from src.incidentes.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict


class ReportanteNoAsignado(BadRequest):
    DETAIL = ErrorCode.REPORTANTE_NO_ASIGNADO


class ReportanteNoEncontrado(NotFound):
    DETAIL = ErrorCode.REPORTANTE_NO_ENCONTRADO


class IncidenteNoEncontrado(NotFound):
    DETAIL = ErrorCode.INCIDENTE_NO_ENCONTRADO


class ResponsableNoEncontrado(NotFound):
    DETAIL = ErrorCode.RESPONSABLE_NO_ENCONTRADO


class IncidenteYaCerrado(Conflict):
    DETAIL = ErrorCode.INCIDENTE_YA_CERRADO


class IncidenteYaAbierto(Conflict):
    DETAIL = ErrorCode.INCIDENTE_YA_ABIERTO

class IncidenteErrorIntegridad(Conflict):
    DETAIL = ErrorCode.INCIDENTE_ERROR_INTEGRIDAD