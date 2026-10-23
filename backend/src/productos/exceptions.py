from src.productos.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO

class ProductoInactivo(Conflict):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO

class ProductoErrorIntegridad(Conflict):
    DETAIL = ErrorCode.PRODUCTO_ERROR_INTEGRIDAD