from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

# === REUTILIZACIÓN DE SERVICIOS EXISTENTES ===
from src.dashboard import schemas
from src.dashboard.metrics import (
    calcular_resumen_tareas,
    calcular_resumen_vencimientos,
)
from src.incidentes.models import Incidente
from src.tipo_incidente.models import TipoIncidente
from src.vencimientos.constants import CategoriaVencimiento, Constantes


# === VENCIMIENTOS POR CATEGORÍA ===
def _calcular_metricas_vencimientos_por_categoria(db: Session, hoy: date) -> list[tuple[schemas.MetricaCard, schemas.GraficoConfig]]:
    """Calcula métricas de vencimientos separadas por categoría."""
    categorias_config = [
        (CategoriaVencimiento.EQUIPO, "vencimientos_equipos", "Vencimientos - Calibraciones de equipos", "/vencimientos"),
        (CategoriaVencimiento.PERSONAL, "vencimientos_personal", "Vencimientos - Documentación del personal", "/vencimientos"),
        (CategoriaVencimiento.DOCUMENTO, "vencimientos_documentos", "Vencimientos - Documentos", "/vencimientos"),
        (CategoriaVencimiento.ELEMENTO_LIMPIEZA, "vencimientos_elementos_limpieza", "Vencimientos - Recambio de elementos de limpieza", "/vencimientos"),
    ]

    resumenes = {
        resumen.categoria: resumen
        for resumen in calcular_resumen_vencimientos(db, hoy)
    }
    resultados = []

    for categoria, key, titulo, link in categorias_config:
        resumen = resumenes[categoria]

        if resumen.total == 0:
            card = schemas.MetricaCard(
                key=key,
                titulo=titulo,
                valor=0.0,
                unidad="porcentaje",
                detalle="Sin vencimientos registrados",
                link=link,
            )
            grafico = schemas.GraficoConfig(
                tipo="pie",
                datos=[],
                leyendas=[schemas.LeyendaItem(label="Sin datos")],
            )
            resultados.append((card, grafico))
            continue

        requieren_atencion = resumen.vencidos + resumen.proximos
        porcentaje_requieren = (
            round((requieren_atencion / resumen.total) * 100, 1)
            if resumen.total > 0
            else 0.0
        )

        card = schemas.MetricaCard(
            key=key,
            titulo=titulo,
            valor=porcentaje_requieren,
            unidad="porcentaje",
            detalle=f"{requieren_atencion} de {resumen.total} ítems requieren atención",
            link=link,
        )

        grafico = schemas.GraficoConfig(
            tipo="pie",
            datos=[
                schemas.GraficoDato(label="Vencidos", valor=float(resumen.vencidos)),
                schemas.GraficoDato(label="Próximos a vencer", valor=float(resumen.proximos)),
                schemas.GraficoDato(label="Vigentes", valor=float(resumen.vigentes)),
            ],
            leyendas=[
                schemas.LeyendaItem(label="Vencidos - Requieren atención inmediata (< 0 días)", valor=float(resumen.vencidos)),
                schemas.LeyendaItem(
                    label=(
                        "Próximos a vencer - Atender en los próximos "
                        f"{Constantes.DIAS_AVISO_PROXIMO} días "
                        f"(0 a {Constantes.DIAS_AVISO_PROXIMO} días)"
                    ),
                    valor=float(resumen.proximos),
                ),
                schemas.LeyendaItem(
                    label=(
                        "Vigentes - Fuera de la ventana de aviso "
                        f"(> {Constantes.DIAS_AVISO_PROXIMO} días)"
                    ),
                    valor=float(resumen.vigentes),
                ),
            ],
        )
        resultados.append((card, grafico))

    return resultados


# === INCIDENTES POR TIPO ===
def _calcular_metricas_incidentes(db: Session, desde: date | None, hasta: date | None) -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    """Calcula incidentes agrupados por tipo con estado abierto/cerrado."""
    query = select(Incidente)
    if desde:
        query = query.where(Incidente.fecha_hora_reporte >= desde)
    if hasta:
        from datetime import datetime, time
        query = query.where(Incidente.fecha_hora_reporte <= datetime.combine(hasta, time.max))
    
    incidentes = db.scalars(query).all()
    total = len(incidentes)
    
    # Calcular cerrados/abiertos para la tarjeta
    cerrados = sum(1 for i in incidentes if not i.abierto)
    abiertos = total - cerrados
    porcentaje_cerrados = round((cerrados / total) * 100, 1) if total > 0 else 0.0
    
    card = schemas.MetricaCard(
        key="incidentes",
        titulo="Incidentes",
        valor=porcentaje_cerrados,
        unidad="porcentaje",
        detalle=f"{cerrados} de {total} incidentes cerrados en el rango",
        link="/incidentes",
    )
    
    if total == 0:
        grafico = schemas.GraficoConfig(
            tipo="pie",
            datos=[],
            leyendas=[schemas.LeyendaItem(label="Sin datos")],
        )
        return card, grafico
    
    # Agrupar por tipo
    tipos_query = select(TipoIncidente.id, TipoIncidente.nombre).order_by(TipoIncidente.nombre)
    tipos = db.execute(tipos_query).all()
    
    datos = []
    leyendas = []
    for tipo_id, tipo_nombre in tipos:
        tipo_incidentes = [i for i in incidentes if i.tipo_id == tipo_id]
        if not tipo_incidentes:
            continue
        tipo_cerrados = sum(1 for i in tipo_incidentes if not i.abierto)
        tipo_abiertos = len(tipo_incidentes) - tipo_cerrados
        datos.append(schemas.GraficoDato(label=f"{tipo_nombre} - Abiertos", valor=float(tipo_abiertos)))
        datos.append(schemas.GraficoDato(label=f"{tipo_nombre} - Cerrados", valor=float(tipo_cerrados)))
        leyendas.append(schemas.LeyendaItem(label=f"{tipo_nombre} - Abiertos", valor=float(tipo_abiertos)))
        leyendas.append(schemas.LeyendaItem(label=f"{tipo_nombre} - Cerrados", valor=float(tipo_cerrados)))
    
    if not datos:
        grafico = schemas.GraficoConfig(
            tipo="pie",
            datos=[schemas.GraficoDato(label="Cerrados", valor=float(cerrados)), schemas.GraficoDato(label="Abiertos", valor=float(abiertos))],
            leyendas=[
                schemas.LeyendaItem(label="Cerrados - Con acción correctiva registrada", valor=float(cerrados)),
                schemas.LeyendaItem(label="Abiertos - Pendientes de cierre", valor=float(abiertos)),
            ],
        )
        return card, grafico
    
    grafico = schemas.GraficoConfig(
        tipo="pie",
        datos=datos,
        leyendas=leyendas,
    )
    return card, grafico


# === CUMPLIMIENTO DE TAREAS ===
def _calcular_metricas_tareas(db: Session, desde: date | None, hasta: date | None) -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    """Calcula % de cumplimiento de tareas por fecha_programada."""
    resumen = calcular_resumen_tareas(db, desde, hasta)

    if resumen.total_tareas + resumen.pendientes == 0:
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

    if resumen.total_tareas == 0:
        detalle = f"{resumen.pendientes} tareas pendientes sin cerrar en el rango"
    else:
        detalle = (
            f"{resumen.completadas} de {resumen.total_tareas} tareas cerradas "
            f"fueron completadas ({resumen.pendientes} aún pendientes)"
        )

    card = schemas.MetricaCard(
        key="tareas",
        titulo="Cumplimiento de tareas",
        valor=resumen.porcentaje_cumplimiento,
        unidad="porcentaje",
        detalle=detalle,
        link="/historial",
    )

    grafico = schemas.GraficoConfig(
        tipo="pie",
        datos=[
            schemas.GraficoDato(label="Completadas", valor=float(resumen.completadas)),
            schemas.GraficoDato(label="No realizadas", valor=float(resumen.incumplidas)),
            schemas.GraficoDato(label="Pendientes", valor=float(resumen.pendientes)),
        ],
        leyendas=[
            schemas.LeyendaItem(label="Completadas - Ejecutadas correctamente", valor=float(resumen.completadas)),
            schemas.LeyendaItem(label="No realizadas - Vencidas o marcadas como no realizadas", valor=float(resumen.incumplidas)),
            schemas.LeyendaItem(label="Pendientes - Aún por ejecutar", valor=float(resumen.pendientes)),
        ],
    )
    return card, grafico


# === LOTES PRODUCIDOS ===
def _calcular_metricas_lotes() -> tuple[schemas.MetricaCard, schemas.GraficoConfig]:
    """Lotes producidos - No implementado en el proyecto actual."""
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
def obtener_dashboard(db: Session, desde: date | None = None, hasta: date | None = None) -> schemas.DashboardResponse:
    """Consolida todas las métricas en una única respuesta para el dashboard."""
    hoy = date.today()
    tarjetas = []
    graficos = {}
    
    # Métricas por tipo de vencimiento
    for card_venc, graf_venc in _calcular_metricas_vencimientos_por_categoria(db, hoy):
        tarjetas.append(card_venc)
        graficos[card_venc.key] = graf_venc
    
    # Incidentes, tareas, lotes
    card_inc, graf_inc = _calcular_metricas_incidentes(db, desde, hasta)
    tarjetas.append(card_inc)
    graficos[card_inc.key] = graf_inc
    
    card_tar, graf_tar = _calcular_metricas_tareas(db, desde, hasta)
    tarjetas.append(card_tar)
    graficos[card_tar.key] = graf_tar
    
    card_lotes, graf_lotes = _calcular_metricas_lotes()
    tarjetas.append(card_lotes)
    graficos[card_lotes.key] = graf_lotes

    return schemas.DashboardResponse(
        desde=desde,
        hasta=hasta,
        tarjetas=tarjetas,
        graficos=graficos,
        totales=None,
    )
