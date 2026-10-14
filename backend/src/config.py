import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Definimos las variables con sus tipos y valores por defecto (opcional)
    DB_URL: str
    DB_URL_TEST: str
    ENV: str = "DEV"
    ROOT_PATH_DEVELOPMENT: str = ""
    ROOT_PATH_PRODUCTION: str = ""
    LOG_LEVEL: str = "INFO"

    # Autenticación JWT: algoritmo y claves de firma. SECRET_KEY firma los
    # access tokens (cortos) y REFRESH_SECRET_KEY los refresh tokens (cookie
    # httpOnly de larga duración); ambas se leen desde el .env.
    ALGORITHM: str = "HS256"
    SECRET_KEY: str
    REFRESH_SECRET_KEY: str

    # Vigencias de los tokens.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth2: endpoint de login (para Swagger UI) y nombre de la cookie de refresh.
    TOKEN_URL: str = "auth/token"
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"

    # Orígenes permitidos por CORS, separados por coma. En producción se define
    # el dominio real del frontend sin tocar el código.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Atributo SameSite de la cookie de refresh. En dev alcanza "lax"; si el
    # frontend y el backend viven en sitios distintos hace falta "none" (que a su
    # vez exige SECURE_COOKIES=true).
    COOKIE_SAMESITE: str = "lax"

    # False en DEV (http sobre localhost); True en producción (https).
    SECURE_COOKIES: bool = False

    # Configuración para que lea automáticamente el archivo .env
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignora otras variables que estén en el .env y no definamos en este archivo
    )

    @model_validator(mode="after")
    def _endurecer_cookies_en_produccion(self):
        # Red de seguridad: fuera de DEV la cookie de refresh solo debe viajar
        # por HTTPS. Si no se definió SECURE_COOKIES explícitamente, se fuerza.
        if self.ENV.upper() != "DEV" and not self.SECURE_COOKIES:
            self.SECURE_COOKIES = True
        return self


# Instancia global que reutilizaremos en el proyecto
settings = Settings()
