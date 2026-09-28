class ErrorCode:
    # Errores de Plan
    PLAN_NO_ENCONTRADO = "El plan POES no fue encontrado."
    BORRADOR_YA_EXISTENTE = "Ya existe un plan en estado borrador. Debe activarlo o descartarlo antes de crear uno nuevo."
    PLAN_ARCHIVADO_NO_EDITABLE = "Un plan histórico/archivado no puede ser modificado."
    PLAN_NO_ES_BORRADOR = "La acción requiere que el plan se encuentre en estado borrador."
    PLAN_NO_ACTIVO = "La acción requiere que el plan se encuentre activo."
    PLAN_NO_ARCHIVADO = "La acción requiere que el plan se encuentre archivado (histórico)."
    PLAN_SIN_TAREAS = "No se puede activar un plan que no tiene tareas asignadas."
    
    # Errores de Tarea
    TAREA_NO_ENCONTRADA = "La tarea POES no fue encontrada."
    ASIGNACION_TAREA_INVALIDA = "La tarea debe estar asignada a un Equipo O a un Sector, pero no a ambos ni a ninguno."
    TAREA_SIN_RECURSOS = "La tarea debe incluir al menos un producto químico o un elemento de limpieza."
    RECURSO_ASOCIADO_INACTIVO = "El recurso que intenta asociar se encuentra inactivo. Debe reactivarlo para poder asignarlo a la tarea."
    RECURSO_INCOMPATIBLE = "El recurso no puede ser asignado a esta tarea porque está configurado para uso exclusivo en otro sector o equipo."
    FRECUENCIA_INVALIDA = "La combinación de frecuencia y detalle de frecuencia proporcionada no es válida."
    TAREA_INACTIVA = "La tarea se encuentra dada de baja. Para modificarla, debe reactivarla."
    BAJA_POR_PATCH_NO_PERMITIDA = "No está permitido dar de baja una tarea mediante edición (PATCH). Utilice el endpoint de eliminación (DELETE) correspondiente."

class TipoRecurso:
    EQUIPO = "Equipo"
    SECTOR = "Sector"
    INSUMO_QUIMICO = "Insumo Quimico"
    ELEMENTO_LIMPIEZA = "Elemento de Limpieza"