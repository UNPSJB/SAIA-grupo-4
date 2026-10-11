from src.exceptions import BadRequest
from src.vencimientos.constants import ErrorCode


# =============================================================================
# Categoria declarada en el contrato pero todavia sin provider registrado
# =============================================================================
# Se lanza cuando se pide filtrar por una categoria que todavia no aporta datos
# (por ejemplo `?categoria=personal` antes de que E3 mergee). Devolver una lista
# vacia seria ambiguo: no se distingue "no hay vencimientos" de "esa categoria
# aun no existe", y el frontend no podria decidir si mostrar un estado vacio o
# un aviso.
class CategoriaNoDisponible(BadRequest):
    DETAIL = ErrorCode.CATEGORIA_NO_DISPONIBLE