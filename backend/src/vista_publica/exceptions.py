# Excepciones específicas de la vista pública.

from src.exceptions import BadRequest, NotFound


class VistaPublicaNoEncontrada(NotFound):
    DETAIL = "La vista pública no existe."


class IndicadorDesconocido(BadRequest):
    DETAIL = "Uno o más indicadores no existen en el catálogo de la vista pública."
