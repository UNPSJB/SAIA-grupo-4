from typing import List
from src.insumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


# Excepciones para Insumo
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class InsumoNoExiste(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_EXISTE