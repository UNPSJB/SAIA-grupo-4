class ErrorCode:
    SECTOR_NO_ENCONTRADO = "El sector no fue encontrado."
    SECTOR_DUPLICADO = "El sector ya existe."
    SECTOR_TIENE_EQUIPOS = "No se puede dar de baja el sector porque tiene equipos asociados."
    SECTOR_INACTIVO = "El sector asociado se encuentra dado de baja. Debe reactivar el sector primero."
    SECTOR_BAJA_NO_PERMITIDA = "La baja del sector debe realizarse mediante el endpoint de eliminación."
    SECTOR_REQUIERE_REACTIVACION = "El sector ya existe pero está dado de baja."