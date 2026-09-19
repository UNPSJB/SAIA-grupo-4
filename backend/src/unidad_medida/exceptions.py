from src.unidad_medida.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, Conflict


# Excepciones para Unidad Medida
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class UnidadMedidaNoEncontrada(NotFound):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_NO_EXISTE

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO

class UnidadMedidaActiva(BadRequest):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_ACTIVA

class UnidadMedidaBaja(BadRequest):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_BAJA

class UnidadMedidaReactivar(BadRequest):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_REACTIVAR

class NombreDuplicadoInactivo(Conflict):
    def __init__(self, unidad_medida_id: int) -> None:
        self.unidad_medida_id = unidad_medida_id
        self.DETAIL = {
            "code": ErrorCode.NOMBRE_DUPLICADO_INACTIVO,
            "unidad_medida_id": unidad_medida_id,
        }
        super().__init__(headers={"X-Unidad-Medida-Id": str(unidad_medida_id)})

class UnidadMedidaEnUso(Conflict):
    DETAIL = ErrorCode.UNIDAD_MEDIDA_EN_USO