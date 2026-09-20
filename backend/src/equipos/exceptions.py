from src.equipos.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

class EquipoNoEncontrado(NotFound):
    DETAIL = ErrorCode.EQUIPO_NO_ENCONTRADO
    
class EquipoDuplicado(Conflict):
    DETAIL = ErrorCode.EQUIPO_DUPLICADO

class EquipoRequiereReactivacion(Conflict):
    def __init__(self, equipo_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.EQUIPO_REQUIERE_REACTIVACION,
                "equipo_id": equipo_id,
            }
        )

class EquipoInactivo(Conflict):
    DETAIL = ErrorCode.EQUIPO_INACTIVO
    
class EquipoBajaNoPermitida(BadRequest): 
    DETAIL = ErrorCode.EQUIPO_BAJA_NO_PERMITIDA