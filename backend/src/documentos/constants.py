from enum import Enum

class TipoDocumentoEnum(str, Enum):
    MANUAL_BPM = "MANUAL_BPM"
    PROCEDIMIENTO = "PROCEDIMIENTO"
    INSTRUCTIVO = "INSTRUCTIVO"
    PLANILLA = "PLANILLA"
    OTRO = "OTRO"
    
class ErrorCode:
    DOCUMENTO_NO_ENCONTRADO = "El documento solicitado no existe en el sistema."
    VERSION_NO_ENCONTRADA = "La versión del documento solicitada no existe."
    CODIGO_DUPLICADO = "El código asignado ya está siendo utilizado por otro documento."
    CODIGO_DUPLICADO_INACTIVO = "Ya existe un documento con ese código pero está dado de baja."
    DOCUMENTO_INACTIVO = "El documento se encuentra inactivo. No se pueden agregar versiones ni modificar su vigencia."
    BAJA_NO_PERMITIDA = "No se puede dar de baja el documento mediante actualización. Utilice la acción de eliminación correspondiente."
    
    ARCHIVO_INVALIDO = "El archivo adjunto no es válido. Debe ser un documento con formato PDF."
    
    # Útiles para cuando atajemos JSON + UploadFile en el Router
    FORMATO_JSON_INVALIDO = "Los datos enviados no tienen un formato JSON válido."
    DATOS_VALIDACION_ERROR = "Error de validación en los datos ingresados."