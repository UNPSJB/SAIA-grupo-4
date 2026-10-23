from src.productos.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO

class ProductoInactivo(Conflict):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO

class ProductoDuplicado(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_DUPLICADO

class ProductoDuplicadoInactivo(Conflict):
    def __init__(self, producto_id: int) -> None:
        self.producto_id = producto_id
        self.DETAIL = {
            "code": ErrorCode.PRODUCTO_DUPLICADO_INACTIVO,
            "producto_id": producto_id,
        }
        super().__init__(headers={"X-Producto-Id": str(producto_id)})

class ProductoErrorIntegridad(Conflict):
    DETAIL = ErrorCode.PRODUCTO_ERROR_INTEGRIDAD