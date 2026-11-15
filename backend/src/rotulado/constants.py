from enum import Enum


class DictamenAplicabilidad(str, Enum):
    APLICA = "APLICA"
    NO_APLICA = "NO_APLICA"
    EXCEPTUADO = "EXCEPTUADO"


class MensajesAplicabilidad:
    APLICA_TITULO = "Aplica evaluación de sellos"
    APLICA_MOTIVO = "El producto se comercializa envasado en ausencia del cliente y contiene nutrientes críticos agregados y/o edulcorantes o cafeína."

    NO_APLICA_TITULO = "No corresponde rotulado frontal"
    NO_APLICA_MOTIVO = "No corresponde rotulado frontal: el producto no se comercializa envasado en ausencia del cliente."

    EXCEPTUADO_TITULO = "Exceptuado de rotulado frontal"
    EXCEPTUADO_MOTIVO = "Exceptuado de rotulado frontal: no contiene azúcares, grasas o sodio agregados, ni edulcorantes o cafeína."


class NormativaDefecto:
    CODIGO = "LEY_27642"
    NOMBRE = "Ley 27.642 de Promoción de la Alimentación Saludable"
    VERSION = "Etapa 2 - Decreto 151/2022"
    REQUIERE_ENVASADO = True
    EVALUA_AZUCARES = True
    EVALUA_GRASAS = True
    EVALUA_SODIO = True
    EVALUA_EDULCORANTES = True
    EVALUA_CAFEINA = True
