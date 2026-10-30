class ErrorCode:
    PRODUCTO_NO_ENCONTRADO = "El producto no fue encontrado."
    PRODUCTO_INACTIVO = "El producto se encuentra inactivo."
    PRODUCTO_DUPLICADO = "Ya existe un producto con el mismo nombre y unidad de medida."
    PRODUCTO_DUPLICADO_INACTIVO = "Ya existe un producto con el mismo nombre y unidad de medida pero esta dado de baja."
    PRODUCTO_CON_RECETA_ACTIVA = "No se puede dar de baja el producto porque tiene una o más recetas activas asociadas."

    PRODUCTO_ERROR_INTEGRIDAD = "No se pudo guardar el producto por un error de integridad de datos."