class ErrorCode:
    PERSONA_NO_ENCONTRADA = "La persona no fue encontrada."
    PERSONA_DUPLICADA = "Ya existe un miembro del personal con el mismo DNI o Legajo."
    PERSONA_REQUIERE_REACTIVACION = "El miembro del personal ya existe pero está dado de baja."
    PERSONA_INACTIVA = "El miembro del personal está dado de baja y debe ser reactivado antes de modificarlo."
    PERSONA_BAJA_NO_PERMITIDA = "La baja del personal debe realizarse mediante el endpoint de eliminación."
    SIN_CAPACIDADES = "La persona debe tener al menos una capacidad asignada."
    VENCIMIENTO_NO_ENCONTRADO = "El vencimiento no fue encontrado."
    FECHA_VENCIMIENTO_OBLIGATORIA = "La fecha de vencimiento es obligatoria."
    FECHAS_VENCIMIENTO_INVALIDAS = "La fecha de emisión debe ser anterior a la fecha de vencimiento."
    COMPROBANTE_INVALIDO = "El comprobante debe ser una imagen JPG o PNG, o un archivo PDF."
    VENCIMIENTO_DUPLICADO = "La persona ya tiene un vencimiento cargado para ese documento."
    ULTIMO_ADMINISTRADOR = "No se puede realizar la acción porque es el último Administrador activo del sistema."

class Constantes:
    # Tipos de archivo aceptados como comprobante y la extension con la que se guardan
    EXTENSIONES_COMPROBANTE = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "application/pdf": ".pdf",
    }