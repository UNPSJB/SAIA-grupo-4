class ErrorCode:
    NOMBRE_DUPLICADO = "El nombre de la unidad de medida ya existe"
    UNIDAD_MEDIDA_NO_EXISTE = "La unidad de medida no fue encontrada"
    ERROR_INESPERADO = "Ocurrio un error inesperado"
    UNIDAD_MEDIDA_ACTIVA = "La unidad de medida ya esta activa"
    UNIDAD_MEDIDA_BAJA = "La unidad de medida ya esta dada de baja"
    UNIDAD_MEDIDA_REACTIVAR = "La unidad de medida asociada se encuentra dada de baja. Debe reactivarse la unidad de medida primero"
    NOMBRE_DUPLICADO_INACTIVO = "Ya existe una unidad de medida con ese nombre pero está dada de baja"
    UNIDAD_MEDIDA_EN_USO = "No se puede eliminar una unidad de medida asociada a un insumo activo"

class Constantes:
    pass # Constantes para valores fijos y evitar valores hardcodeados


class Factores:
    MASA_A_GRAMOS = {
        # símbolo o nombre normalizado -> factor a gramos
        "g": 1.0,
        "gr": 1.0,
        "gramo": 1.0,
        "gramos": 1.0,
        "kg": 1000.0,
        "kilo": 1000.0,
        "kilogramo": 1000.0,
        "kilogramos": 1000.0,
        "mg": 0.001,
        "miligramo": 0.001,
        "miligramos": 0.001,
    }

    VOLUMEN_A_ML = {
        # símbolo o nombre normalizado -> factor a mililitros (ml)
        "ml": 1.0,
        "cc": 1.0,
        "cm3": 1.0,
        "mililitro": 1.0,
        "mililitros": 1.0,
        "l": 1000.0,
        "lt": 1000.0,
        "litro": 1000.0,
        "litros": 1000.0,
    }

    CANTIDAD_A_UNIDAD = {
        # símbolo o nombre normalizado -> factor a unidades individuales
        "u": 1.0,
        "un": 1.0,
        "unidad": 1.0,
        "unidades": 1.0,
        "doc": 12.0,
        "dz": 12.0,
        "docena": 12.0,
        "docenas": 12.0,
    }
