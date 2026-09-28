from src.checklists.constants import ErrorCode
from src.exceptions import NotFound, Conflict, BadRequest

class EjecucionNoEncontrada(NotFound):
    DETAIL = ErrorCode.EJECUCION_NO_ENCONTRADA

class EjecucionInmutable(Conflict):
    DETAIL = ErrorCode.EJECUCION_YA_COMPLETADA

class EjecucionVencida(Conflict):
    DETAIL = ErrorCode.EJECUCION_VENCIDA
    
class FormatoJSONInvalido(BadRequest):
    DETAIL = ErrorCode.FORMATO_JSON_INVALIDO

class DatosValidacionError(BadRequest):
    def __init__(self, errores: list):
        super().__init__(
            detail={
                "code": ErrorCode.DATOS_VALIDACION_ERROR,
                "errores": errores
            }
        )
        
class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO

class FechaFuturaHistorial(BadRequest):
    DETAIL = ErrorCode.FECHA_FUTURA_HISTORIAL
    
class ArchivoInvalido(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_INVALIDO