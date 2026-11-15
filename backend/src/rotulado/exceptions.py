from src.exceptions import NotFound, BadRequest


class RecetaNoEncontrada(NotFound):
    DETAIL = "La receta especificada no fue encontrada."


class ProductoSinReceta(BadRequest):
    DETAIL = "La receta no tiene un producto asociado válido."
