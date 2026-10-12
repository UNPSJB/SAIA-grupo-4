from src.documentos_personal.constants import ErrorCode
from src.exceptions import NotFound, Conflict

class DocumentoPersonalNoEncontrado(NotFound): DETAIL = ErrorCode.DOCUMENTO_NO_ENCONTRADO
class DocumentoPersonalDuplicado(Conflict): DETAIL = ErrorCode.DOCUMENTO_DUPLICADO
class DocumentoPersonalInactivo(Conflict): DETAIL = ErrorCode.DOCUMENTO_INACTIVO
class DocumentoPersonalRequiereReactivacion(Conflict):
    def __init__(self, documento_id: int):
        super().__init__(detail={"code": ErrorCode.DOCUMENTO_REQUIERE_REACTIVACION, "documento_id": documento_id})
