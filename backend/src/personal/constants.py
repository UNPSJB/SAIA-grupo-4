class ErrorCode:
    PERSONA_NO_ENCONTRADA = "La persona no fue encontrada."
    PERSONA_DUPLICADA = "Ya existe un miembro del personal con el mismo DNI o Legajo."
    PERSONA_REQUIERE_REACTIVACION = "El miembro del personal ya existe pero está dado de baja."
    PERSONA_INACTIVA = "El miembro del personal está dado de baja y debe ser reactivado antes de modificarlo."
    PERSONA_BAJA_NO_PERMITIDA = "La baja del personal debe realizarse mediante el endpoint de eliminación."
    SIN_CAPACIDADES = "La persona debe tener al menos una capacidad asignada."
    ULTIMO_ADMINISTRADOR = "No se puede realizar la acción porque es el último Administrador activo del sistema."