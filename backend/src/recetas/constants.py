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
    
    # Errores de Pasos de Receta
    PASO_NO_ENCONTRADO = "El paso de la receta no fue encontrado."
    PASO_INACTIVO = "El paso se encuentra dado de baja. Para modificarlo, debe reactivarlo."
    BAJA_PASO_POR_PATCH_NO_PERMITIDA = "No está permitido dar de baja un paso mediante edición (PATCH). Utilice el endpoint de eliminación (DELETE) correspondiente."
    RECURSO_ASOCIADO_INACTIVO = "El recurso que intenta asociar se encuentra inactivo. Debe reactivarlo para poder asignarlo al paso."
    NUMERO_ORDEN_DUPLICADO = "Ya existe un paso con el número de orden ingresado en esta receta."

    # Errores de Orden Manual (Declaración CAA)
    ORDEN_MANUAL_INSUMOS_INVALIDOS = "La lista de IDs para orden manual no coincide exactamente con los insumos presentes en la receta."
    ORDEN_MANUAL_FRONTERA_INVALIDA = "Un aditivo no puede preceder a una materia prima según la normativa CAA (Cap. V). No se permite cruzar la frontera entre zonas."
    ORDEN_MANUAL_PROPORCION_INVALIDA = "El orden de las materias primas debe ser estrictamente decreciente por porcentaje. Solo se permite reordenar materias primas con idéntica proporción."
    ORDEN_MANUAL_CLASES_FRAGMENTADAS = "Los aditivos deben permanecer estrictamente agrupados por su clase funcional. No se permite fragmentar una clase funcional."

class TipoRecurso:
    EQUIPO = "Equipo"
    INSUMO = "Insumo"