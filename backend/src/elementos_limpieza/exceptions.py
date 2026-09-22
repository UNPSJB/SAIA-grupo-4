from src.elementos_limpieza.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, Conflict


# Excepciones para ElementoLimpieza
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class ElementoNoExiste(NotFound):
    DETAIL = ErrorCode.ELEMENTO_NO_EXISTE

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO

class ElementoActivo(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_ACTIVO

class ElementoBaja(BadRequest):
    DETAIL = ErrorCode.ELEMENTO_BAJA

class NombreDuplicadoInactivo(Conflict):
    def __init__(self, elemento_id: int) -> None:
        self.elemento_id = elemento_id
        self.DETAIL = {
            "code": ErrorCode.NOMBRE_DUPLICADO_INACTIVO,
            "elemento_id": elemento_id,
        }
        super().__init__(headers={"X-Elemento-Id": str(elemento_id)})