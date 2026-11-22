from src.exceptions import BadRequest, Conflict, NotFound
from src.lotes.constants import ErrorCode


class LoteNoEncontrado(NotFound):
    DETAIL = ErrorCode.LOTE_NO_ENCONTRADO


class LoteSinRecetaActiva(BadRequest):
    DETAIL = ErrorCode.LOTE_SIN_RECETA_ACTIVA


class CodigoLoteDuplicado(Conflict):
    DETAIL = ErrorCode.CODIGO_LOTE_DUPLICADO


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class ProductoInactivo(BadRequest):
    DETAIL = ErrorCode.PRODUCTO_INACTIVO


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class InsumoInactivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_INACTIVO


class InsumoNoPerteneceAReceta(BadRequest):
    DETAIL = ErrorCode.INSUMO_NO_PERTENECE_A_RECETA


class InsumoDuplicadoEnLote(BadRequest):
    DETAIL = ErrorCode.INSUMO_DUPLICADO_EN_LOTE


class FechaVencimientoInvalida(BadRequest):
    DETAIL = ErrorCode.FECHA_VENCIMIENTO_INVALIDA


class FechaElaboracionFutura(BadRequest):
    DETAIL = ErrorCode.FECHA_ELABORACION_FUTURA


class CantidadProducidaInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_PRODUCIDA_INVALIDA


class LoteErrorIntegridad(Conflict):
    DETAIL = ErrorCode.LOTE_ERROR_INTEGRIDAD


class ConsumosIncompletos(BadRequest):
    DETAIL = ErrorCode.CONSUMOS_INCOMPLETOS


class LoteInsumoRequerido(BadRequest):
    DETAIL = ErrorCode.LOTE_INSUMO_REQUERIDO


class LoteInsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.LOTE_INSUMO_NO_ENCONTRADO


class LoteInsumoNoPertenece(BadRequest):
    DETAIL = ErrorCode.LOTE_INSUMO_NO_PERTENECE


class LoteInsumoInactivoOVencido(BadRequest):
    DETAIL = ErrorCode.LOTE_INSUMO_INACTIVO_O_VENCIDO


class LoteInsumoDuplicado(BadRequest):
    DETAIL = ErrorCode.LOTE_INSUMO_DUPLICADO


class BalanceConsumoLoteInvalido(BadRequest):
    DETAIL = ErrorCode.BALANCE_CONSUMO_LOTE_INVALIDO


class StockLoteInsumoInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_LOTE_INSUMO_INSUFICIENTE


class UnidadConsumoInvalida(BadRequest):
    DETAIL = ErrorCode.UNIDAD_CONSUMO_INVALIDA


class LoteYaRetenido(BadRequest):
    DETAIL = ErrorCode.LOTE_YA_RETENIDO
