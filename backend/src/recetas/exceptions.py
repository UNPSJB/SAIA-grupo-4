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