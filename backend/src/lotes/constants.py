class LoteConstants:
    PREFIJO_CODIGO = "LOT"
    DIGITOS_SECUENCIA = 3


class ErrorCode:
    LOTE_NO_ENCONTRADO = "El lote no fue encontrado."
    LOTE_SIN_RECETA_ACTIVA = "El producto no posee una receta en estado ACTIVA."
    CODIGO_LOTE_DUPLICADO = "El código de lote ya existe en el sistema."
    PRODUCTO_NO_ENCONTRADO = "El producto seleccionado no existe."
    PRODUCTO_INACTIVO = "El producto seleccionado se encuentra inactivo."
    INSUMO_NO_ENCONTRADO = "Uno de los insumos seleccionados no existe."
    INSUMO_INACTIVO = "Uno de los insumos se encuentra inactivo o dado de baja."
    INSUMO_NO_PERTENECE_A_RECETA = "El insumo no pertenece a la receta activa del producto."
    INSUMO_DUPLICADO_EN_LOTE = "No se puede repetir el mismo insumo en el lote."
    FECHA_VENCIMIENTO_INVALIDA = "La fecha de vencimiento no puede ser anterior a la fecha de elaboración."
    FECHA_ELABORACION_FUTURA = "La fecha de elaboración no puede ser posterior a la fecha y hora actual."
    CANTIDAD_PRODUCIDA_INVALIDA = "La cantidad producida debe ser mayor a cero."
    LOTE_ERROR_INTEGRIDAD = "No se pudo registrar el lote debido a un conflicto de integridad de datos."
