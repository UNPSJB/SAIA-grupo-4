from typing import List
from fastapi import status
from src.insumos.constants import ErrorCode
from src.exceptions import NotFound, BadRequest, Conflict


# Excepciones para Insumo
class NombreDuplicado(BadRequest):
    DETAIL = ErrorCode.NOMBRE_DUPLICADO

class InsumoNoExiste(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_EXISTE

class ErrorInesperado(BadRequest):
    DETAIL = ErrorCode.ERROR_INESPERADO

class InsumoActivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_ACTIVO

class InsumoBaja(BadRequest):
    DETAIL = ErrorCode.INSUMO_BAJA

class NombreDuplicadoInactivo(Conflict):
    def __init__(self, insumo_id: int) -> None:
        self.insumo_id = insumo_id
        self.DETAIL = {
            "code": ErrorCode.NOMBRE_DUPLICADO_INACTIVO,
            "insumo_id": insumo_id,
        }
        super().__init__(headers={"X-Insumo-Id": str(insumo_id)})


class InsumoConRecetaActiva(Conflict):
    def __init__(self, insumo_nombre: str, receta_nombre: str) -> None:
        super().__init__(
            detail=ErrorCode.INSUMO_CON_RECETA_ACTIVA.format(
                insumo_nombre=insumo_nombre,
                receta_nombre=receta_nombre,
            )
        )


class DensidadSoloVolumen(BadRequest):
    DETAIL = ErrorCode.DENSIDAD_SOLO_VOLUMEN


class PesoUnitarioSoloCantidad(BadRequest):
    DETAIL = ErrorCode.PESO_UNITARIO_SOLO_CANTIDAD


class EquivalenciaNoAplicaMasa(BadRequest):
    DETAIL = ErrorCode.EQUIVALENCIA_NO_APLICA_MASA