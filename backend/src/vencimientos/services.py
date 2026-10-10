from datetime import date

from sqlalchemy.orm import Session

from src.vencimientos import providers, schemas, exceptions
from src.vencimientos.constants import (
    CategoriaVencimiento,
    Constantes,
    EstadoVencimiento,
    ETIQUETA_CATEGORIA,
    ESTADOS_POR_VENCER,
    FiltroEstadoVencimiento,
)


# Semaforizacion 

def calcular_estado(dias_restantes: int) -> EstadoVencimiento:
    if dias_restantes < 0:
        return EstadoVencimiento.VENCIDO
    if dias_restantes <= Constantes.DIAS_AVISO_PROXIMO:
        return EstadoVencimiento.PROXIMO
    return EstadoVencimiento.VIGENTE


def _resolver_corte(
    estado: FiltroEstadoVencimiento | None,
    dias_max: int | None,
) -> int | None:
    """Dias hasta donde se recorta el listado, o None para no recortar.

    Sin filtro de estado se respeta el `dias_max` que venga (y si no viene, no
    se recorta). El corte por defecto ya no se aplica solo: `vigente` esta
    definido como "vence despues de DIAS_AVISO_PROXIMO dias", asi que un corte
    implicito en ese mismo umbral dejaba fuera justamente a los vigentes y
    "Todos los estados" no podia mostrarlos. Acortar la ventana es explicito.
    """
    if estado == FiltroEstadoVencimiento.VIGENTE:
        return None
    return dias_max

# Consulta consolidada

# Agrega lo que aporta cada provider. Cada provider ya viene ordenado por
# urgencia desde su modulo, pero el orden final se redefine aca para que sea
# global entre categorias.
def listar_vencimientos(
    db: Session,
    estado: FiltroEstadoVencimiento | None = None,
    categoria: CategoriaVencimiento | None = None,
    dias_max: int | None = None,
) -> list[schemas.Vencimiento]:
    hoy = date.today()

    if categoria is not None and not providers.hay_proveedor(categoria):
        raise exceptions.CategoriaNoDisponible()

    vencimientos: list[schemas.Vencimiento] = []
    for proveedor in providers.proveedores():
        vencimientos.extend(proveedor.listar(db, hoy))

    corte = _resolver_corte(estado, dias_max)
    if corte is not None:
        vencimientos = [v for v in vencimientos if v.dias_restantes <= corte]

    if categoria is not None:
        vencimientos = [v for v in vencimientos if v.categoria == categoria]

    if estado is not None:
        if estado == FiltroEstadoVencimiento.POR_VENCER:
            vencimientos = [v for v in vencimientos if v.estado in ESTADOS_POR_VENCER]
        else:
            vencimientos = [v for v in vencimientos if v.estado.value == estado.value]

    # Orden por urgencia: primero lo mas negativo (mas vencido), primero lo que vence hoy.
    vencimientos.sort(key=lambda v: (v.dias_restantes, v.categoria.value, v.concepto))
    return vencimientos


# Categorias disponibles (para el filtro del frontend)

def listar_categorias(
    db: Session,
    dias_max: int | None = None,
) -> list[schemas.CategoriaDisponible]:
    hoy = date.today()
    disponibles = []

    for proveedor in providers.proveedores():
        propios = proveedor.listar(db, hoy)
        if dias_max is not None:
            propios = [v for v in propios if v.dias_restantes <= dias_max]
        disponibles.append(
            schemas.CategoriaDisponible(
                valor=proveedor.categoria,
                nombre=ETIQUETA_CATEGORIA[proveedor.categoria.value],
                total=len(propios),
            )
        )

    disponibles.sort(key=lambda c: c.nombre)
    return disponibles