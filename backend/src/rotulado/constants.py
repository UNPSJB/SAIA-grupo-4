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


class CodigoSelloAdvertencia(str, Enum):
    EXCESO_AZUCARES = "EXCESO_AZUCARES"
    EXCESO_GRASAS_TOTALES = "EXCESO_GRASAS_TOTALES"
    EXCESO_GRASAS_SATURADAS = "EXCESO_GRASAS_SATURADAS"
    EXCESO_SODIO = "EXCESO_SODIO"
    EXCESO_CALORIAS = "EXCESO_CALORIAS"


class CodigoLeyendaPrecautoria(str, Enum):
    CONTIENE_EDULCORANTES = "CONTIENE_EDULCORANTES"
    CONTIENE_CAFEINA = "CONTIENE_CAFEINA"


class TextosSellos:
    SELLOS = {
        CodigoSelloAdvertencia.EXCESO_AZUCARES: "EXCESO EN AZÚCARES",
        CodigoSelloAdvertencia.EXCESO_GRASAS_TOTALES: "EXCESO EN GRASAS TOTALES",
        CodigoSelloAdvertencia.EXCESO_GRASAS_SATURADAS: "EXCESO EN GRASAS SATURADAS",
        CodigoSelloAdvertencia.EXCESO_SODIO: "EXCESO EN SODIO",
        CodigoSelloAdvertencia.EXCESO_CALORIAS: "EXCESO EN CALORÍAS",
    }
    LEYENDAS = {
        CodigoLeyendaPrecautoria.CONTIENE_EDULCORANTES: "CONTIENE EDULCORANTES, NO RECOMENDABLE EN NIÑOS/AS",
        CodigoLeyendaPrecautoria.CONTIENE_CAFEINA: "CONTIENE CAFEÍNA. EVITAR EN NIÑOS/AS",
    }


class UmbralesEtapa2:
    FACTOR_KCAL_AZUCARES = 4.0
    FACTOR_KCAL_GRASAS = 9.0
    UMBRAL_PCT_AZUCARES = 10.0
    UMBRAL_PCT_GRASAS_TOTALES = 30.0
    UMBRAL_PCT_GRASAS_SATURADAS = 10.0
    UMBRAL_SODIO_MG_POR_KCAL = 1.0
    UMBRAL_SODIO_SOLIDO_MG = 300.0
    UMBRAL_SODIO_LIQUIDO_MG = 40.0
    UMBRAL_CALORIAS_SOLIDO_KCAL = 275.0
    UMBRAL_CALORIAS_LIQUIDO_KCAL = 25.0
