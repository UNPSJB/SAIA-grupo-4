from enum import StrEnum

class ErrorCode:
    LOTE_NO_EXISTE = "El lote del insumo no fue encontrado"
    LOTE_BAJA = "El lote del insumo ya esta dado de baja"
    INSUMO_NO_DISPONIBLE = "No se puede registrar un lote para un insumo dado de baja"
    ERROR_INESPERADO = "Ocurrio un error inesperado"
    LOTE_NO_VENCIDO = "El lote del insumo todavia no esta vencido"
    CODIGO_LOTE_DUPLICADO = "Ya existe un lote registrado con ese codigo para este insumo"
    FECHA_VENCIMIENTO_PASADA = "La fecha de vencimiento no puede ser anterior a la fecha actual"

class Constantes:
    MOTIVO_BAJA_VENCIDO = "Descarte por fecha de vencimiento alcanzada"

class EstadoLote(StrEnum):
    ACTIVO = "activo"
    INHABILITADO = "inhabilitado"
    VENCIDO = "vencido"
    AGOTADO = "agotado"

