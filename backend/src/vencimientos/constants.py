from enum import Enum


# Categorias de vencimiento 

# El enum declara las cuatro categorias que la vista consolidada debe cubrir.
class CategoriaVencimiento(str, Enum):
    PERSONAL = "personal"                      # documentacion del personal
    EQUIPO = "equipo"                          # calibracion de equipos
    ELEMENTO_LIMPIEZA = "elemento_limpieza"    # datos ya disponibles
    DOCUMENTO = "documento"                    # vencimientos documentales


# Etiquetas legibles para la UI
ETIQUETA_CATEGORIA: dict[str, str] = {
    CategoriaVencimiento.PERSONAL.value: "Personal",
    CategoriaVencimiento.EQUIPO.value: "Equipos",
    CategoriaVencimiento.ELEMENTO_LIMPIEZA.value: "Elementos de limpieza",
    CategoriaVencimiento.DOCUMENTO.value: "Documentos",
}


# Estados y umbral de urgencia
class EstadoVencimiento(str, Enum):
    VENCIDO = "vencido"    # dias_restantes < 0
    PROXIMO = "proximo"    # 0 <= dias_restantes <= 15
    VIGENTE = "vigente"    # dias_restantes > 15


class FiltroEstadoVencimiento(str, Enum):
    VENCIDO = "vencido"
    PROXIMO = "proximo"
    VIGENTE = "vigente"
    POR_VENCER = "por_vencer"


ESTADOS_POR_VENCER = frozenset({EstadoVencimiento.VENCIDO, EstadoVencimiento.PROXIMO})


# Ventana de aviso de la vista consolidada.
class Constantes:
    DIAS_AVISO_PROXIMO = 15


class ErrorCode:
    CATEGORIA_NO_DISPONIBLE = "La categoria solicitada todavia no tiene vencimientos registrados. "
    