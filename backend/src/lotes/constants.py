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
    CONSUMOS_INCOMPLETOS = "Debe informar los consumos para todos los insumos activos de la receta."
    LOTE_INSUMO_REQUERIDO = "Debe asignar al menos un lote físico de insumo cuando la cantidad consumida es mayor a cero."
    LOTE_INSUMO_NO_ENCONTRADO = "Uno de los lotes de insumo seleccionados no existe."
    LOTE_INSUMO_NO_PERTENECE = "Uno de los lotes físicos seleccionados no corresponde al insumo indicado."
    LOTE_INSUMO_INACTIVO_O_VENCIDO = "No se puede consumir un lote de insumo inhabilitado, vencido o agotado."
    LOTE_INSUMO_DUPLICADO = "No se puede asignar el mismo lote físico dos veces para un mismo insumo."
    BALANCE_CONSUMO_LOTE_INVALIDO = "La suma de las cantidades tomadas de los lotes físicos debe coincidir exactamente con la cantidad real consumida."
    STOCK_LOTE_INSUMO_INSUFICIENTE = "La cantidad asignada supera el stock disponible del lote físico de insumo."
    UNIDAD_CONSUMO_INVALIDA = "La unidad de medida indicada no es compatible con la unidad base del insumo."
