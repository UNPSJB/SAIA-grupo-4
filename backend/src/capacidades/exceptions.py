from src.capacidades.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

class CapacidadNoEncontrada(NotFound): DETAIL = ErrorCode.CAPACIDAD_NO_ENCONTRADA
class CapacidadDuplicada(Conflict): DETAIL = ErrorCode.CAPACIDAD_DUPLICADA
class CapacidadInactiva(Conflict): DETAIL = ErrorCode.CAPACIDAD_INACTIVA
class CapacidadEnUso(Conflict): DETAIL = ErrorCode.CAPACIDAD_EN_USO
class CapacidadBajaNoPermitida(BadRequest): DETAIL = ErrorCode.CAPACIDAD_BAJA_NO_PERMITIDA
class ModificacionSistemaDenegada(BadRequest): DETAIL = ErrorCode.MODIFICACION_SISTEMA_DENEGADA
class CapacidadAsociadaInactiva(Conflict): DETAIL = ErrorCode.CAPACIDAD_ASOCIADA_INACTIVA
class CapacidadRequiereReactivacion(Conflict):
    def __init__(self, capacidad_id: int):
        super().__init__(detail={"code": ErrorCode.CAPACIDAD_REQUIERE_REACTIVACION, "capacidad_id": capacidad_id})