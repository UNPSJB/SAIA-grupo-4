from src.exceptions import BadRequest, Conflict, NotFound


class RecetaNoEncontrada(NotFound):
    DETAIL = "La receta especificada no fue encontrada."


class ProductoSinReceta(BadRequest):
    DETAIL = "La receta no tiene un producto asociado válido."


class RecetaConLotesNoEditableAplicabilidad(Conflict):
    DETAIL = (
        "No se pueden modificar los overrides de una receta activa con lotes asociados. "
        "Clone la receta para generar un nuevo borrador."
    )


class RecetaArchivadaNoEditableAplicabilidad(Conflict):
    DETAIL = "No se pueden modificar los overrides de una receta archivada."
