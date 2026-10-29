import unicodedata
from sqlalchemy import String, cast, func, or_


def normalizar(texto: str | None) -> str:
    """Minúsculas y sin acentos: 'Pérez' -> 'perez'."""
    if not texto:
        return ""
    descompuesto = unicodedata.normalize("NFD", texto)
    sin_acentos = "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")
    return sin_acentos.lower().strip()


def condicion_busqueda(columnas: list, texto: str):
    """OR de coincidencias parciales, sin mayúsculas ni acentos, sobre las columnas dadas."""
    normalizado = normalizar(texto)
    # autoescape=True escapa % y _ del texto del usuario
    return or_(*(
        func.normalizar(cast(col, String)).contains(normalizado, autoescape=True)
        for col in columnas
    ))