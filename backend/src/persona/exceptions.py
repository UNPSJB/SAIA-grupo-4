from src.exceptions import NotFound
from src.persona.constants import ErrorCode


class PersonaNoEncontrada(NotFound):
    DETAIL = ErrorCode.PERSONA_NO_ENCONTRADA