# Excepciones específicas de la vista pública.

from src.exceptions import NotFound


class VistaPublicaNoEncontrada(NotFound):
    DETAIL = "La vista pública no existe."
