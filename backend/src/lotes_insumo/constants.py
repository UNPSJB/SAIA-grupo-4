from enum import StrEnum

class ErrorCode:
    LOTE_NO_EXISTE = "El lote del insumo no fue encontrado"
    LOTE_BAJA = "El lote del insumo ya esta dado de baja"
    INSUMO_NO_DISPONIBLE = "No se puede registrar un lote para un insumo dado de baja"
    ERROR_INESPERADO = "Ocurrio un error inesperado"

class Constantes:
    pass


class EstadoLote(StrEnum):
    ACTIVO = "activo"
    INHABILITADO = "inhabilitado"
    VENCIDO = "vencido"