"""Constantes del módulo de vista pública.

El catálogo de indicadores replica los bloques que hoy ve un visitante en la
vista pública (cumplimiento y vencimientos) y agrega los indicadores de
incidentes. Estos últimos están apagados por defecto porque exponen
información sensible de la operación interna.
"""

from dataclasses import dataclass

from src.vencimientos.constants import CategoriaVencimiento

# Ventana de cumplimiento: últimos 30 días cerrados (sin incluir hoy).
DIAS_VENTANA_CUMPLIMIENTO = 30

MENSAJE_VISTA_DESACTIVADA = "La vista pública está desactivada."
MENSAJE_VISTA_NO_EXISTE = "La vista pública no existe."
MENSAJE_SIN_INDICADORES = "No hay indicadores habilitados en la vista pública."
MENSAJE_INDICADOR_DESCONOCIDO = (
    "Uno o más indicadores no existen en el catálogo de la vista pública."
)


@dataclass(frozen=True)
class DefinicionIndicador:
    """Definición de un indicador configurable de la vista pública."""

    clave: str
    nombre: str
    descripcion: str
    por_defecto: bool
    sensible: bool = False


INDICADORES_CATALOGO: tuple[DefinicionIndicador, ...] = (
    DefinicionIndicador(
        clave="cumplimiento_tareas",
        nombre="Cumplimiento de checklists",
        descripcion="Porcentaje y totales de tareas cerradas en el período.",
        por_defecto=True,
    ),
    DefinicionIndicador(
        clave="vencimientos_resumen",
        nombre="Vencimientos al día (resumen general)",
        descripcion="Porcentaje general de vencimientos al día.",
        por_defecto=True,
    ),
    DefinicionIndicador(
        clave="vencimientos_equipos",
        nombre="Equipos calibrados al día",
        descripcion="Calibraciones de equipos al día.",
        por_defecto=True,
    ),
    DefinicionIndicador(
        clave="vencimientos_documentos",
        nombre="Documentos al día",
        descripcion="Vencimientos documentales al día.",
        por_defecto=True,
    ),
    DefinicionIndicador(
        clave="vencimientos_elementos_limpieza",
        nombre="Elementos de limpieza al día",
        descripcion="Recambios de elementos de limpieza al día.",
        por_defecto=True,
    ),
    DefinicionIndicador(
        clave="vencimientos_personal",
        nombre="Documentación del personal al día",
        descripcion="Documentación del personal al día.",
        por_defecto=True,
    ),
    DefinicionIndicador(
        clave="incidentes",
        nombre="Incidentes",
        descripcion=(
            "Totales globales de incidentes abiertos y cerrados. "
            "Dato sensible de la operación interna."
        ),
        por_defecto=False,
        sensible=True,
    ),
)

INDICADORES_POR_CLAVE: dict[str, DefinicionIndicador] = {
    indicador.clave: indicador for indicador in INDICADORES_CATALOGO
}

INDICADORES_POR_DEFECTO: dict[str, bool] = {
    indicador.clave: indicador.por_defecto for indicador in INDICADORES_CATALOGO
}

# Clave configurable -> categoría de vencimientos que controla.
CATEGORIA_POR_CLAVE: dict[str, CategoriaVencimiento] = {
    "vencimientos_equipos": CategoriaVencimiento.EQUIPO,
    "vencimientos_personal": CategoriaVencimiento.PERSONAL,
    "vencimientos_documentos": CategoriaVencimiento.DOCUMENTO,
    "vencimientos_elementos_limpieza": CategoriaVencimiento.ELEMENTO_LIMPIEZA,
}

CLAVES_VENCIMIENTOS_CATEGORIA = frozenset(CATEGORIA_POR_CLAVE)
CLAVE_VENCIMIENTOS_RESUMEN = "vencimientos_resumen"
CLAVE_INCIDENTES = "incidentes"
