from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

# === REUTILIZACIÓN DE SERVICIOS EXISTENTES ===
# Se reutilizan servicios y modelos ya existentes para no duplicar lógica
from src.checklists.constants import EstadoEjecucion
from src.checklists.models import EjecucionTarea
from src.dashboard import schemas
from src.incidentes.services import listar_incidentes
from src.vencimientos import providers


# === VENCIMIENTOS ===
# Calcula porcentaje de vencimientos sobre el estado actual.
# Se toman todos los proveedores registrados (calibraciones, documentación personal,
# documentos, elementos de limpieza, etc.) y se evalúa con date.today().
# Coherente con el tablero de vencimientos.
def _calcular_metricas_vencimientos(db: Session) -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    hoy = date.today()
    todos = []

    # Reutilizamos el registry de proveedores (misma lógica que listar_vencimientos)
    for prov in providers.proveedores():
        todos.extend(prov.listar(db, hoy))

    total = len(todos)
    if total == 0:
        card = schemas.MetricaCard(
            key="vencimientos",
            titulo="Vencimientos que requieren atención",
            valor=0.0,
            unidad="porcentaje",
            detalle="Sin vencimientos registrados",
            link="/vencimientos",
        )
        grafico = schemas.GraficoConfig(
            tipo="pie",
            datos=[],
            leyendas=[
                schemas.LeyendaItem(label="Sin datos")
            ],
        )
        return card, grafico

    vencidos = sum(1 for v in todos if v.dias_restantes < 0)
    proximos = sum(1 for v in todos if 0 <= v.dias_restantes <= 15)
    vigentes = sum(1 for v in todos if v.dias_restantes > 15)
    requieren_atencion = vencidos + proximos
    if total > 0:
        porcentaje_requieren = round((requieren_atencion / total) * 100, 1)
    else:
        porcentaje_requieren = 0.0

    card = schemas.MetricaCard(
        key="vencimientos",
        titulo="Vencimientos que requieren atención",
        valor=porcentaje_requieren,
        unidad="porcentaje",
        detalle=f"{requieren_atencion} de {total} ítems (vencidos + próximos a vencer)",
        link="/vencimientos",
    )

    grafico = schemas.GraficoConfig(
        tipo="pie",
        datos=[
            schemas.GraficoDato(label="Vencidos", valor=float(vencidos)),
            schemas.GraficoDato(label="Próximos a vencer", valor=float(proximos)),
            schemas.GraficoDato(label="Vigentes", valor=float(vigentes)),
        ],
        leyendas=[
            schemas.LeyendaItem(label="Vencidos - Requieren atención inmediata (< 0 días)", valor=float(vencidos)),
            schemas.LeyendaItem(label="Próximos a vencer - Atender en los próximos 15 días (0 a 15 días)", valor=float(proximos)),
            schemas.LeyendaItem(label="Vigentes - Fuera de la ventana de aviso (> 15 días)", valor=float(vigentes)),
        ],
    )
    return card, grafico


# === INCIDENTES ===
# Calcula % de incidentes cerrados en el rango de fechas indicado.
# Se filtra por fecha_hora_reporte entre desde/hasta.
def _calcular_metricas_incidentes(db: Session, desde: date | None, hasta: date | None) -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    incidentes = listar_incidentes(db, tipo_id=None, desde=desde, hasta=hasta)
    total = len(incidentes)

    if total == 0:
        card = schemas.MetricaCard(
            key="incidentes",
            titulo="Incidentes cerrados",
            valor=0.0,
            unidad="porcentaje",
            detalle="Sin incidentes en el rango seleccionado",
            link="/incidentes",
        )
        grafico = schemas.GraficoConfig(
            tipo="pie",
            datos=[],
            leyendas=[schemas.LeyendaItem(label="Sin datos")],
        )
        return card, grafico

    cerrados = sum(1 for i in incidentes if not i.abierto)
    abiertos = total - cerrados
    if total > 0:
        porcentaje_cerrados = round((cerrados / total) * 100, 1)
    else:
        porcentaje_cerrados = 0.0

    card = schemas.MetricaCard(
        key="incidentes",
        titulo="Incidentes cerrados",
        valor=porcentaje_cerrados,
        unidad="porcentaje",
        detalle=f"{cerrados} de {total} incidentes cerrados en el rango",
        link="/incidentes",
    )

    grafico = schemas.GraficoConfig(
        tipo="pie",
        datos=[
            schemas.GraficoDato(label="Cerrados", valor=float(cerrados)),
            schemas.GraficoDato(label="Abiertos", valor=float(abiertos)),
        ],
        leyendas=[
            schemas.LeyendaItem(label="Cerrados - Con acción correctiva registrada", valor=float(cerrados)),
            schemas.LeyendaItem(label="Abiertos - Pendientes de cierre", valor=float(abiertos)),
        ],
    )
    return card, grafico


# === CUMPLIMIENTO DE TAREAS ===
# Calcula % de cumplimiento de tareas por fecha_programada.
# Fuente: EjecucionTarea (checklists).
# Estados: COMPLETADA, NO_REALIZADA, PENDIENTE.
# Denominador: COMPLETADAS + NO_REALIZADAS (tareas ya cerradas por ejecución/vencimiento).
# Se excluyen PENDIENTES del porcentaje para reflejar cumplimiento sobre tareas ejecutadas/cerradas.
def _calcular_metricas_tareas(db: Session, desde: date | None, hasta: date | None) -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    query = select(EjecucionTarea)
    if desde and hasta:
        query = query.where(EjecucionTarea.fecha_programada.between(desde, hasta))
    elif desde:
        query = query.where(EjecucionTarea.fecha_programada >= desde)
    elif hasta:
        query = query.where(EjecucionTarea.fecha_programada <= hasta)

    ejecuciones = db.scalars(query).all()
    total = len(ejecuciones)

    if total == 0:
        card = schemas.MetricaCard(
            key="tareas",
            titulo="Cumplimiento de tareas",
            valor=0.0,
            unidad="porcentaje",
            detalle="Sin ejecuciones programadas en el rango seleccionado",
            link="/historial",
        )
        grafico = schemas.GraficoConfig(
            tipo="pie",
            datos=[],
            leyendas=[schemas.LeyendaItem(label="Sin datos")],
        )
        return card, grafico

    completadas = sum(1 for e in ejecuciones if e.estado == EstadoEjecucion.COMPLETADA)
    no_realizadas = sum(1 for e in ejecuciones if e.estado == EstadoEjecucion.NO_REALIZADA)
    pendientes = sum(1 for e in ejecuciones if e.estado == EstadoEjecucion.PENDIENTE)

    cerradas = completadas + no_realizadas
    if cerradas == 0:
        porcentaje_cumplimiento = 0.0
        detalle = f"{pendientes} tareas pendientes sin cerrar en el rango"
    else:
        porcentaje_cumplimiento = round((completadas / cerradas) * 100, 1)
        detalle = f"{completadas} de {cerradas} tareas cerradas fueron completadas ({pendientes} aún pendientes)"

    card = schemas.MetricaCard(
        key="tareas",
        titulo="Cumplimiento de tareas",
        valor=porcentaje_cumplimiento,
        unidad="porcentaje",
        detalle=detalle,
        link="/historial",
    )

    grafico = schemas.GraficoConfig(
        tipo="pie",
        datos=[
            schemas.GraficoDato(label="Completadas", valor=float(completadas)),
            schemas.GraficoDato(label="No realizadas", valor=float(no_realizadas)),
            schemas.GraficoDato(label="Pendientes", valor=float(pendientes)),
        ],
        leyendas=[
            schemas.LeyendaItem(label="Completadas - Ejecutadas correctamente", valor=float(completadas)),
            schemas.LeyendaItem(label="No realizadas - Vencidas o marcadas como no realizadas", valor=float(no_realizadas)),
            schemas.LeyendaItem(label="Pendientes - Aún por ejecutar", valor=float(pendientes)),
        ],
    )
    return card, grafico


# === LOTES PRODUCIDOS ===
def _calcular_metricas_lotes() -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    card = schemas.MetricaCard(
        key="lotes",
        titulo="Lotes producidos",
        valor=0.0,
        unidad="cantidad",
        detalle="Funcionalidad no implementada",
        link=None,
    )
    grafico = schemas.GraficoConfig(
        tipo="pie",
        datos=[],
        leyendas=[schemas.LeyendaItem(label="Sin datos disponibles (no implementado)")],
    )
    return card, grafico


# === FUNCIÓN PRINCIPAL ===
# Consolida todas las métricas en una única respuesta para el dashboard.
# Reutiliza servicios/providers existentes (vencimientos, incidentes, checklists)
# Una sola respuesta con tarjetas + gráficos + leyendas obligatorias
# Protegido por requiere_administracion (aplicado en router)
def obtener_dashboard(db: Session, desde: date | None = None, hasta: date | None = None) -> schemas.DashboardResponse:
    card_venc, graf_venc = _calcular_metricas_vencimientos(db)
    card_inc, graf_inc = _calcular_metricas_incidentes(db, desde, hasta)
    card_tar, graf_tar = _calcular_metricas_tareas(db, desde, hasta)
    card_lotes, graf_lotes = _calcular_metricas_lotes()

    return schemas.DashboardResponse(
        desde=desde,
        hasta=hasta,
        tarjetas=[card_venc, card_inc, card_tar, card_lotes],
        graficos={
            "vencimientos": graf_venc,
            "incidentes": graf_inc,
            "tareas": graf_tar,
            "lotes": graf_lotes,
        },
        totales=None,
    )
