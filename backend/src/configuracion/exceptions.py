from src.configuracion.constants import ErrorCode
from src.exceptions import BadRequest

class ArchivoLogoInvalido(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_LOGO_INVALIDO

class ArchivoLogoMuyGrande(BadRequest):
    DETAIL = ErrorCode.ARCHIVO_LOGO_MUY_GRANDE