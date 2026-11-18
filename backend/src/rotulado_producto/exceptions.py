from src.exceptions import NotFound


class ProductoNoEncontrado(NotFound):
    DETAIL = "El producto especificado no fue encontrado."
