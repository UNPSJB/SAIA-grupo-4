class ErrorCode:
    CAPACIDAD_NO_ENCONTRADA = "La capacidad no fue encontrada."
    CAPACIDAD_DUPLICADA = "Ya existe una capacidad con ese nombre."
    CAPACIDAD_REQUIERE_REACTIVACION = "La capacidad ya existe pero está inactiva."
    CAPACIDAD_INACTIVA = "La capacidad está dada de baja."
    CAPACIDAD_EN_USO = "No se puede dar de baja porque hay personal activo con esta capacidad."
    CAPACIDAD_BAJA_NO_PERMITIDA = "La baja de la capacidad debe realizarse mediante el endpoint de eliminación."
    MODIFICACION_SISTEMA_DENEGADA = "Las capacidades del sistema no pueden ser modificadas ni eliminadas."
    CAPACIDAD_ASOCIADA_INACTIVA = "Una de las capacidades asociadas está dada de baja. Debe reactivar la capacidad primero."

class RolesSistema:
    ADMINISTRAR = "administrar"
    OPERAR = "operar"