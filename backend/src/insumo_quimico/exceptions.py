from typing import List
from fastapi import status
from src.insumo_quimico.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, Conflict

# Excepciones para Insumo Químico
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class InsumoQuimicoNoExiste(NotFound):
    DETAIL = ErrorCode.INSUMO_QUIMICO_NO_EXISTE

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO

class InsumoQuimicoActivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_QUIMICO_ACTIVO

class InsumoQuimicoBaja(BadRequest):
    DETAIL = ErrorCode.INSUMO_QUIMICO_BAJA

class NombreDuplicadoInactivo(Conflict):
    def __init__(self, insumo_quimico_id: int) -> None:
        self.insumo_quimico_id = insumo_quimico_id
        self.DETAIL = {
            "code": ErrorCode.NOMBRE_DUPLICADO_INACTIVO,
            "insumo_quimico_id": insumo_quimico_id,
        }
        super().__init__(headers={"X-Insumo-Quimico-Id": str(insumo_quimico_id)})