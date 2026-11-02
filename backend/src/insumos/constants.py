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

class Constantes:
    pass # Constantes para valores fijos y evitar valores hardcodeados
