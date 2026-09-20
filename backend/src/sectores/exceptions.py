from src.sectores.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict


class SectorNoEncontrado(NotFound):
    DETAIL = ErrorCode.SECTOR_NO_ENCONTRADO


class SectorDuplicado(Conflict):
    DETAIL = ErrorCode.SECTOR_DUPLICADO


class SectorTieneEquipos(Conflict):
    DETAIL = ErrorCode.SECTOR_TIENE_EQUIPOS
    
class SectorInactivo(Conflict):
    DETAIL = ErrorCode.SECTOR_INACTIVO

class SectorBajaNoPermitida(BadRequest):
    DETAIL = ErrorCode.SECTOR_BAJA_NO_PERMITIDA
    
class SectorRequiereReactivacion(Conflict):
    def __init__(self, sector_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.SECTOR_REQUIERE_REACTIVACION,
                "sector_id": sector_id,
            }
        )