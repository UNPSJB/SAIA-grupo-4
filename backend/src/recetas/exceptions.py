from src.exceptions import BadRequest, Conflict, NotFound
from src.recetas.constants import ErrorCode


# EXCEPCIONES DE RECETA

class RecetaNoEncontrada(NotFound):
    DETAIL = ErrorCode.RECETA_NO_ENCONTRADA


class RecetaNoEsBorrador(BadRequest):
    DETAIL = ErrorCode.RECETA_NO_ES_BORRADOR


class RecetaNoActiva(BadRequest):
    DETAIL = ErrorCode.RECETA_NO_ACTIVA


class RecetaInhabilitadaNoEditable(BadRequest):
    DETAIL = ErrorCode.RECETA_INHABILITADA_NO_EDITABLE


class RecetaConLotesNoEditable(BadRequest):
    DETAIL = ErrorCode.RECETA_CON_LOTES_NO_EDITABLE


class RecetaNoEditable(BadRequest):
    DETAIL = ErrorCode.RECETA_NO_EDITABLE


class RecetaSinPasos(BadRequest):
    DETAIL = ErrorCode.RECETA_SIN_PASOS


class CodigoRecetaDuplicado(Conflict):
    DETAIL = ErrorCode.CODIGO_RECETA_DUPLICADO


class ProductoInvalido(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INVALIDO
    
class PasoRecetaNoEncontrado(NotFound):
    DETAIL = ErrorCode.PASO_NO_ENCONTRADO

class PasoInactivo(Conflict):
    DETAIL = ErrorCode.PASO_INACTIVO

class BajaPasoPorPatchNoPermitida(BadRequest):
    DETAIL = ErrorCode.BAJA_PASO_POR_PATCH_NO_PERMITIDA
    
class RecursoInactivo(Conflict):
    def __init__(self, tipo_recurso: str, recurso_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.RECURSO_ASOCIADO_INACTIVO,
                "tipo_recurso": tipo_recurso,
                "recurso_id": recurso_id,
            }
        )

class NumeroOrdenPasoDuplicado(Conflict):
    DETAIL = ErrorCode.NUMERO_ORDEN_DUPLICADO
