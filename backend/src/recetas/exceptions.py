from src.exceptions import BadRequest, Conflict, NotFound
from src.recetas.constants import ErrorCode


# EXCEPCIONES DE RECETA

class RecetaNoEncontrada(NotFound):
    DETAIL = ErrorCode.RECETA_NO_ENCONTRADA


class RecetaNoEsBorrador(BadRequest):
    DETAIL = ErrorCode.RECETA_NO_ES_BORRADOR


class RecetaNoActiva(BadRequest):
    DETAIL = ErrorCode.RECETA_NO_ACTIVA


class RecetaInhabilitadaNoEditable(BadRequest):
    DETAIL = ErrorCode.RECETA_INHABILITADA_NO_EDITABLE


class RecetaConLotesNoEditable(BadRequest):
    DETAIL = ErrorCode.RECETA_CON_LOTES_NO_EDITABLE


class RecetaNoEditable(BadRequest):
    DETAIL = ErrorCode.RECETA_NO_EDITABLE


class RecetaSinPasos(BadRequest):
    DETAIL = ErrorCode.RECETA_SIN_PASOS


class CodigoRecetaDuplicado(Conflict):
    DETAIL = ErrorCode.CODIGO_RECETA_DUPLICADO


class ProductoInvalido(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INVALIDO
    
class PasoRecetaNoEncontrado(NotFound):
    DETAIL = ErrorCode.PASO_NO_ENCONTRADO

class PasoInactivo(Conflict):
    DETAIL = ErrorCode.PASO_INACTIVO

class BajaPasoPorPatchNoPermitida(BadRequest):
    DETAIL = ErrorCode.BAJA_PASO_POR_PATCH_NO_PERMITIDA
    
class RecursoInactivo(Conflict):
    def __init__(self, tipo_recurso: str, recurso_id: int):
        super().__init__(
            detail={
                "code": ErrorCode.RECURSO_ASOCIADO_INACTIVO,
                "tipo_recurso": tipo_recurso,
                "recurso_id": recurso_id,
            }
        )

class NumeroOrdenPasoDuplicado(Conflict):
    DETAIL = ErrorCode.NUMERO_ORDEN_DUPLICADO


# EXCEPCIONES DE ORDEN MANUAL DE INGREDIENTES (CAA CAP. V)

class OrdenManualInsumosInvalidos(BadRequest):
    DETAIL = ErrorCode.ORDEN_MANUAL_INSUMOS_INVALIDOS


class OrdenManualFronteraInvalida(BadRequest):
    DETAIL = ErrorCode.ORDEN_MANUAL_FRONTERA_INVALIDA


class OrdenManualProporcionInvalida(BadRequest):
    def __init__(self, nombre_actual: str, pct_actual: float, nombre_siguiente: str, pct_siguiente: float):
        super().__init__(
            detail=(
                f"El orden de las materias primas debe ser estrictamente decreciente por porcentaje. "
                f"No se puede colocar '{nombre_actual}' ({pct_actual}%) antes de '{nombre_siguiente}' ({pct_siguiente}%). "
                f"Solo se permite reordenar materias primas con idéntica proporción."
            )
        )


class OrdenManualClasesFragmentadas(BadRequest):
    def __init__(self, nombre_clase: str):
        super().__init__(
            detail=(
                f"Los aditivos deben permanecer estrictamente agrupados por su clase funcional. "
                f"La clase '{nombre_clase}' aparece fragmentada en la lista."
            )
        )
