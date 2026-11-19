# Excepciones específicas del dashboard.

from src.exceptions import BadRequest


class RangoFechasInvalido(BadRequest):
    DETAIL = "La fecha 'desde' no puede ser mayor a la fecha 'hasta'."
