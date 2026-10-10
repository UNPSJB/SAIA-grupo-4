from src.documentos.constants import ErrorCode
from src.exceptions import NotFound, Conflict, BadRequest

class DocumentoNoEncontrado(NotFound):
    DETAIL = ErrorCode.DOCUMENTO_NO_ENCONTRADO

class VersionNoEncontrada(NotFound):
    DETAIL = ErrorCode.VERSION_NO_ENCONTRADA

class CodigoDocumentoDuplicado(Conflict):
    DETAIL = ErrorCode.CODIGO_DUPLICADO

class CodigoDocumentoRequiereReactivacion(Conflict):
    def __init__(self, documento_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.CODIGO_DUPLICADO_INACTIVO,
                "documento_id": documento_id,
            }
        )

class DocumentoInactivo(Conflict):
    DETAIL = ErrorCode.DOCUMENTO_INACTIVO

class DocumentoBajaNoPermitida(BadRequest):
    DETAIL = ErrorCode.BAJA_NO_PERMITIDA

class ArchivoInvalido(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_INVALIDO

class FormatoJSONInvalido(BadRequest):
    DETAIL = ErrorCode.FORMATO_JSON_INVALIDO
    
class DatosValidacionError(BadRequest):
    def __init__(self, errores: list):
        super().__init__(
            detail={
                "code": ErrorCode.DATOS_VALIDACION_ERROR,
                "errores": errores
            }
        )