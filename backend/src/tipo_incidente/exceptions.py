from src.tipo_incidente.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, Conflict

class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class TipoNoExiste(NotFound):
    DETAIL = ErrorCode.TIPO_NO_EXISTE

class TipoActivo(BadRequest):
    DETAIL = ErrorCode.TIPO_ACTIVO

class TipoDadoBaja(BadRequest):
    DETAIL = ErrorCode.TIPO_DADO_BAJA

class NombreDuplicadoInactivo(Conflict):
    def __init__(self, tipo_id: int) -> None:
        self.tipo_id = tipo_id
        self.DETAIL = {
            "code": ErrorCode.NOMBRE_DUPLICADO_INACTIVO,
            "tipo_id": tipo_id,
        }
        super().__init__(headers={"X-Tipo-Id": str(tipo_id)})