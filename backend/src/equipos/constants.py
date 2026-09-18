class ErrorCode:
    EQUIPO_NO_ENCONTRADO = "El equipo no fue encontrado."
    EQUIPO_DUPLICADO = "Ya existe un equipo con el mismo nombre, marca y número de serie."
    EQUIPO_REQUIERE_REACTIVACION = "El equipo ya existe pero está dado de baja."
    EQUIPO_INACTIVO = "El equipo está dado de baja y debe ser reactivado antes de modificarlo."
    EQUIPO_BAJA_NO_PERMITIDA = "La baja del equipo debe realizarse mediante el endpoint de eliminación."