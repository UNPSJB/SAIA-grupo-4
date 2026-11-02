"""Cálculos agregados compartidos por el dashboard y la vista pública.

Este módulo no debe importar nada del dominio de incidentes: la vista pública
reutiliza estas funciones y jamás debe arrastrar datos de incidentes.
"""

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.checklists.constants import EstadoEjecucion
from src.checklists.models import EjecucionTarea
from src.vencimientos import providers
from src.vencimientos.constants import CategoriaVencimiento, Constantes


@dataclass(frozen=True)
class ResumenTareas:
    """Conteos de ejecuciones de tareas en un período."""

    total_tareas: int  # completadas + incumplidas
    completadas: int
    incumplidas: int
    pendientes: int
    porcentaje_cumplimiento: float


@dataclass(frozen=True)
class ResumenCategoriaVencimientos:
    """Conteos agregados de una categoría de vencimientos."""

    categoria: CategoriaVencimiento
    total: int
    vencidos: int
    proximos: int
    vigentes: int


CATEGORIAS_VENCIMIENTOS: tuple[CategoriaVencimiento, ...] = (
    CategoriaVencimiento.EQUIPO,
    CategoriaVencimiento.PERSONAL,
    CategoriaVencimiento.DOCUMENTO,
    CategoriaVencimiento.ELEMENTO_LIMPIEZA,
)


def calcular_resumen_tareas(
    db: Session,
    desde: date | None = None,
    hasta: date | None = None,
) -> ResumenTareas:
    """Cuenta las ejecuciones por estado usando `fecha_programada`.

    El total público solo considera tareas cerradas (completadas + no
    realizadas). Las pendientes se devuelven aparte para que el dashboard las
    pueda seguir mostrando sin alterar el porcentaje de cumplimiento.
    """

    query = select(EjecucionTarea.estado)
    if desde and hasta:
        query = query.where(EjecucionTarea.fecha_programada.between(desde, hasta))
    elif desde:
        query = query.where(EjecucionTarea.fecha_programada >= desde)
    elif hasta:
        query = query.where(EjecucionTarea.fecha_programada <= hasta)

    estados = db.scalars(query).all()

    completadas = sum(1 for estado in estados if estado == EstadoEjecucion.COMPLETADA)
    incumplidas = sum(1 for estado in estados if estado == EstadoEjecucion.NO_REALIZADA)
    pendientes = sum(1 for estado in estados if estado == EstadoEjecucion.PENDIENTE)

    total_tareas = completadas + incumplidas
    porcentaje_cumplimiento = (
        round((completadas / total_tareas) * 100, 1) if total_tareas > 0 else 0.0
    )

    return ResumenTareas(
        total_tareas=total_tareas,
        completadas=completadas,
        incumplidas=incumplidas,
        pendientes=pendientes,
        porcentaje_cumplimiento=porcentaje_cumplimiento,
    )


def calcular_resumen_vencimientos(
    db: Session,
    hoy: date | None = None,
) -> list[ResumenCategoriaVencimientos]:
    """Devuelve los conteos de vencimientos para todas las categorías.

    Se incluyen las categorías sin provider o sin ítems con todos sus
    contadores en cero, para que el contrato de respuesta sea estable.
    """

    fecha_referencia = hoy or date.today()
    proveedores_por_categoria = {
        proveedor.categoria: proveedor for proveedor in providers.proveedores()
    }

    resultados: list[ResumenCategoriaVencimientos] = []

    for categoria in CATEGORIAS_VENCIMIENTOS:
        proveedor = proveedores_por_categoria.get(categoria)
        items = proveedor.listar(db, fecha_referencia) if proveedor else []

        vencidos = sum(1 for item in items if item.dias_restantes < 0)
        proximos = sum(
            1
            for item in items
            if 0 <= item.dias_restantes <= Constantes.DIAS_AVISO_PROXIMO
        )
        vigentes = sum(
            1
            for item in items
            if item.dias_restantes > Constantes.DIAS_AVISO_PROXIMO
        )

        resultados.append(
            ResumenCategoriaVencimientos(
                categoria=categoria,
                total=len(items),
                vencidos=vencidos,
                proximos=proximos,
                vigentes=vigentes,
            )
        )

    return resultados
