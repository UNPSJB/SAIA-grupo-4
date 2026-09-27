from enum import Enum


class ErrorCode:
    ELEMENTO_INACTIVO = "El elemento de limpieza está dado de baja"
    SIN_FRECUENCIA = "El elemento de limpieza no tiene una frecuencia de recambio configurada"
    FECHA_FUTURA = "La fecha de recambio no puede ser futura"
    FECHA_ANTERIOR = "La fecha de recambio no puede ser anterior al último recambio registrado"
    ERROR_INESPERADO = "Ocurrio un error inesperado"


class Constantes:
    # Cantidad de días antes del vencimiento a partir de la cual se avisa como "próximo"
    DIAS_AVISO_PROXIMO = 3


class EstadoRecambio(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    AL_DIA = "al_dia"
