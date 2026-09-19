class ErrorCode:
    NOMBRE_DUPLICADO = "El nombre de la unidad de medida ya existe"
    UNIDAD_MEDIDA_NO_EXISTE = "La unidad de medida no fue encontrada"
    ERROR_INESPERADO = "Ocurrio un error inesperado"
    UNIDAD_MEDIDA_ACTIVA = "La unidad de medida ya esta activa"
    UNIDAD_MEDIDA_BAJA = "La unidad de medida ya esta dada de baja"
    NOMBRE_DUPLICADO_INACTIVO = "Ya existe una unidad de medida con ese nombre pero está dada de baja"
    UNIDAD_MEDIDA_EN_USO = "No se puede eliminar una unidad de medida asociada a un insumo activo"

class Constantes:
    pass # Constantes para valores fijos y evitar valores hardcodeados