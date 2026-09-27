from enum import Enum

class ErrorCode:
    EJECUCION_NO_ENCONTRADA = "La ejecución de tarea indicada no existe."
    EJECUCION_YA_COMPLETADA = "Esta tarea ya fue completada. El registro es inmutable y no puede modificarse."
    EJECUCION_VENCIDA = "Esta tarea venció y fue marcada como no realizada. No se puede completar."
    
    FORMATO_JSON_INVALIDO = "El campo 'datos' no es un JSON válido."
    DATOS_VALIDACION_ERROR = "Error de validación en los datos ingresados."
    RANGO_FECHAS_INVALIDO = "La fecha 'desde' no puede ser mayor a la fecha 'hasta'."
    FECHA_FUTURA_HISTORIAL = "El historial solo permite consultar fechas anteriores al día de hoy."
    
    ARCHIVO_INVALIDO = "El archivo adjunto debe ser una imagen válida (JPG, PNG, etc.)."

class EstadoEjecucion(str, Enum):
    PENDIENTE = "PENDIENTE"
    COMPLETADA = "COMPLETADA"
    NO_REALIZADA = "NO_REALIZADA"