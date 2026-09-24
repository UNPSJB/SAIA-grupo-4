from src.plan_poes.constants import ErrorCode
from src.exceptions import BadRequest, NotFound, Conflict

# EXCEPCIONES DE PLAN POES

class PlanPOESNoEncontrado(NotFound):
    DETAIL = ErrorCode.PLAN_NO_ENCONTRADO

class BorradorYaExistente(Conflict):
    DETAIL = ErrorCode.BORRADOR_YA_EXISTENTE

class PlanArchivadoNoEditable(BadRequest):
    DETAIL = ErrorCode.PLAN_ARCHIVADO_NO_EDITABLE

class PlanNoEsBorrador(BadRequest):
    DETAIL = ErrorCode.PLAN_NO_ES_BORRADOR

class PlanNoActivo(BadRequest):
    DETAIL = ErrorCode.PLAN_NO_ACTIVO

class PlanNoArchivado(BadRequest):
    DETAIL = ErrorCode.PLAN_NO_ARCHIVADO

class PlanSinTareas(BadRequest):
    DETAIL = ErrorCode.PLAN_SIN_TAREAS


# EXCEPCIONES DE TAREAS POES

class TareaNoEncontrada(NotFound):
    DETAIL = ErrorCode.TAREA_NO_ENCONTRADA

class TareaAsignacionInvalida(BadRequest):
    DETAIL = ErrorCode.ASIGNACION_TAREA_INVALIDA

class TareaSinRecursos(BadRequest):
    DETAIL = ErrorCode.TAREA_SIN_RECURSOS
    
class TareaInactiva(Conflict): 
    DETAIL = ErrorCode.TAREA_INACTIVA
    
class BajaPorPatchNoPermitida(BadRequest): 
    DETAIL = ErrorCode.BAJA_POR_PATCH_NO_PERMITIDA

class FrecuenciaInvalida(BadRequest):
    def __init__(self, motivo: str):
        super().__init__(
            detail={
                "code": ErrorCode.FRECUENCIA_INVALIDA,
                "motivo": motivo
            }
        )

class RecursoInactivo(Conflict):
    def __init__(self, tipo_recurso: str, recurso_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.RECURSO_ASOCIADO_INACTIVO,
                "tipo_recurso": tipo_recurso,
                "recurso_id": recurso_id,
            }
        )

class RecursoIncompatible(Conflict):
    def __init__(self, tipo_recurso: str, recurso_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.RECURSO_INCOMPATIBLE,
                "tipo_recurso": tipo_recurso,
                "recurso_id": recurso_id,
            }
        )