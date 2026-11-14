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
    ALIMENTO_REFERENCIA_NO_EXISTE = (
        "El alimento de referencia seleccionado no existe"
    )
    NUTRICION_NO_APLICA_ENVASE = (
        "Los insumos de categoría 'envase' no admiten información nutricional"
    )


class Constantes:
    CAMPOS_NUTRIENTES_COMPLETOS = (
        "valor_energetico_kcal",
        "carbohidratos_g",
        "azucares_totales_g",
        "azucares_anadidos_g",
        "proteinas_g",
        "grasas_totales_g",
        "grasas_saturadas_g",
        "grasas_trans_g",
        "fibra_g",
        "sodio_mg",
    )
    MAPA_REFERENCIA_INSUMO = {
        "energia_kcal": "valor_energetico_kcal",
        "carbohidratos_g": "carbohidratos_g",
        "proteinas_g": "proteinas_g",
        "grasas_totales_g": "grasas_totales_g",
        "grasas_saturadas_g": "grasas_saturadas_g",
        "fibra_g": "fibra_g",
        "sodio_mg": "sodio_mg",
    }
    CAMPOS_SEGUIMIENTO_NUTRICIONAL = (
        set(CAMPOS_NUTRIENTES_COMPLETOS)
        | {"base_calculo", "alimento_referencia_id", "fuente_nutricional"}
    )
    CLASES_SIN_INS_OBLIGATORIO = {
        "aromatizante",
        "saborizante",
        "aromatizante / saborizante",
        "aromatizante/saborizante",
    }

