from enum import Enum


class EstadoReceta(str, Enum):
    BORRADOR = "BORRADOR"
    ACTIVA = "ACTIVA"
    INHABILITADA = "INHABILITADA"


class ErrorCode:
    # Errores de Receta
    RECETA_NO_ENCONTRADA = "La receta no fue encontrada."
    RECETA_NO_ES_BORRADOR = "La acción requiere que la receta se encuentre en estado BORRADOR."
    RECETA_NO_ACTIVA = "La acción requiere que la receta se encuentre en estado ACTIVA."
    RECETA_INHABILITADA_NO_EDITABLE = "No se puede modificar una receta en estado INHABILITADA."
    RECETA_CON_LOTES_NO_EDITABLE = "No se puede modificar la receta porque tiene lotes asociados."
    RECETA_NO_EDITABLE = "No se puede modificar la receta en su estado actual."
    RECETA_SIN_PASOS = "No se puede activar una receta que no tiene pasos asignados."
    CODIGO_RECETA_DUPLICADO = "El código de receta ya existe."
    PRODUCTO_INVALIDO = "El producto indicado no es válido."