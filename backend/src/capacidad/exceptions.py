from fastapi import HTTPException, status
from src.capacidad.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class CapacidadNoEncontrada(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capacidad no encontrada"
        )


# Excepciones para Capacidad
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO


class CapacidadNoExiste(NotFound):
    DETAIL = ErrorCode.CAPACIDAD_NO_EXISTE


class PersonaCapacidadNoEncontrada(NotFound):
    DETAIL = ErrorCode.PERSONA_CAPACIDAD_NO_ENCONTRADA