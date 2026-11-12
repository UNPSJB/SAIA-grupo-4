class ErrorCode:
    NOMBRE_DUPLICADO = "El nombre del insumo ya existe"
    INSUMO_NO_EXISTE = "El insumo no fue encontrado"
    ERROR_INESPERADO = "Ocurrio un error inesperado"
    INSUMO_ACTIVO = "El insumo ya esta activo"
    INSUMO_BAJA = "El insumo ya esta dado de baja"
    NOMBRE_DUPLICADO_INACTIVO = "Ya existe un insumo con ese nombre pero está dado de baja"
    INSUMO_CON_RECETA_ACTIVA = (
        "No se puede dar de baja el insumo '{insumo_nombre}' porque forma parte de la receta activa '{receta_nombre}'. "
        "Modificá o inhabilitá la receta antes de dar de baja el insumo."
    )
    DENSIDAD_SOLO_VOLUMEN = (
        "La densidad (g/ml) solo se puede configurar para insumos con unidad de medida de volumen"
    )
    PESO_UNITARIO_SOLO_CANTIDAD = (
        "El peso unitario (g) solo se puede configurar para insumos con unidad de medida de cantidad"
    )
    EQUIVALENCIA_NO_APLICA_MASA = (
        "Los insumos con unidad de medida de masa ya representan peso y no admiten densidad ni peso unitario"
    )
    CLASE_FUNCIONAL_REQUERIDA_ADITIVO = (
        "Los insumos de categoría 'aditivo' requieren especificar su clase funcional"
    )
    NUMERO_INS_REQUERIDO_ADITIVO = (
        "Los aditivos requieren especificar su número INS (excepto aromatizantes o saborizantes)"
    )
    ATRIBUTOS_ADITIVO_NO_APLICAN = (
        "La clase funcional y el número INS solo aplican a insumos de categoría 'aditivo'"
    )


class Constantes:
    CLASES_SIN_INS_OBLIGATORIO = {
        "aromatizante",
        "saborizante",
        "aromatizante / saborizante",
        "aromatizante/saborizante",
    }

