from enum import Enum


class CodigoAlergenoCAA(str, Enum):
    """Catálogo oficial de alérgenos y cereales específicos según Art. 235 séptimo del CAA."""
    TRIGO = "TRIGO"
    AVENA = "AVENA"
    CEBADA = "CEBADA"
    CENTENO = "CENTENO"
    CRUSTACEOS = "CRUSTACEOS"
    HUEVO = "HUEVO"
    PESCADO = "PESCADO"
    MANI = "MANI"
    SOJA = "SOJA"
    LECHE = "LECHE"
    ALMENDRAS = "ALMENDRAS"
    AVELLANAS = "AVELLANAS"
    CASTANAS = "CASTANAS"
    NUECES = "NUECES"
    PISTACHOS = "PISTACHOS"
    DIOXIDO_AZUFRE_SULFITOS = "DIOXIDO_AZUFRE_SULFITOS"


ETIQUETAS_ALERGENOS_CAA: dict[CodigoAlergenoCAA, str] = {
    CodigoAlergenoCAA.TRIGO: "TRIGO",
    CodigoAlergenoCAA.AVENA: "AVENA",
    CodigoAlergenoCAA.CEBADA: "CEBADA",
    CodigoAlergenoCAA.CENTENO: "CENTENO",
    CodigoAlergenoCAA.CRUSTACEOS: "CRUSTÁCEOS",
    CodigoAlergenoCAA.HUEVO: "HUEVO",
    CodigoAlergenoCAA.PESCADO: "PESCADO",
    CodigoAlergenoCAA.MANI: "MANÍ",
    CodigoAlergenoCAA.SOJA: "SOJA",
    CodigoAlergenoCAA.LECHE: "LECHE",
    CodigoAlergenoCAA.ALMENDRAS: "ALMENDRAS",
    CodigoAlergenoCAA.AVELLANAS: "AVELLANAS",
    CodigoAlergenoCAA.CASTANAS: "CASTAÑAS",
    CodigoAlergenoCAA.NUECES: "NUECES",
    CodigoAlergenoCAA.PISTACHOS: "PISTACHOS",
    CodigoAlergenoCAA.DIOXIDO_AZUFRE_SULFITOS: "SULFITOS",
}


class EstadoValidacionAlergenos(str, Enum):
    SUGERIDO = "SUGERIDO"
    CONFIRMADO = "CONFIRMADO"
