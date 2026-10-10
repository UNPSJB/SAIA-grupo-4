from src.personal.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

class PersonaNoEncontrada(NotFound): DETAIL = ErrorCode.PERSONA_NO_ENCONTRADA
class PersonaDuplicada(Conflict): DETAIL = ErrorCode.PERSONA_DUPLICADA
class PersonaInactiva(Conflict): DETAIL = ErrorCode.PERSONA_INACTIVA
class PersonaBajaNoPermitida(BadRequest): DETAIL = ErrorCode.PERSONA_BAJA_NO_PERMITIDA
class SinCapacidades(BadRequest): DETAIL = ErrorCode.SIN_CAPACIDADES
class UltimoAdministrador(Conflict): DETAIL = ErrorCode.ULTIMO_ADMINISTRADOR
class PasswordRequerida(BadRequest): DETAIL = ErrorCode.PASSWORD_REQUERIDA
class PasswordNoPermitida(BadRequest): DETAIL = ErrorCode.PASSWORD_NO_PERMITIDA
class PersonaRequiereReactivacion(Conflict):
    def __init__(self, persona_id: int):
        super().__init__(detail={"code": ErrorCode.PERSONA_REQUIERE_REACTIVACION, "persona_id": persona_id})