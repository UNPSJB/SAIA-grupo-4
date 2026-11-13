class ErrorCode:
    ARCHIVO_LOGO_INVALIDO = "El logo debe ser una imagen en formato PNG, JPG o WebP."
    ARCHIVO_LOGO_MUY_GRANDE = "El tamaño del logo no puede superar los 2 MB."
    CUIT_INVALIDO = "El CUIT debe contener exactamente 11 dígitos numéricos."

class Constantes:
    NOMBRE_DEFECTO = "SAIA-4"
    MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
    EXTENSIONES_PERMITIDAS = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
    }