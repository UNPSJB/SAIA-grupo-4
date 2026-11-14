// Cálculos del dashboard compartidos entre la pantalla (DashboardPage) y el
// informe imprimible (DashboardPrintView), para que los dos muestren lo mismo.

import { formatearFecha } from "../../../utils/fecha";
import type { DashboardResponse, GraficoConfig, MetricaCard } from "../types";

// Mapea claves de gráfico a títulos descriptivos
export const getChartTitle = (key: string): string => {
  const titleMap: Record<string, string> = {
    vencimientos_equipos: "Vencimientos - Calibraciones de equipos",
    vencimientos_personal: "Vencimientos - Documentación del personal",
    vencimientos_documentos: "Vencimientos - Documentos",
    vencimientos_elementos_limpieza: "Vencimientos - Elementos de limpieza",
    vencimientos: "Vencimientos que requieren atención",
    incidentes: "Incidentes cerrados",
    tareas: "Cumplimiento de tareas",
    lotes: "Lotes producidos",
  };
  return titleMap[key] || key;
};

export const VENCIMIENTO_KEYS = [
  "vencimientos_equipos",
  "vencimientos_personal",
  "vencimientos_documentos",
  "vencimientos_elementos_limpieza",
] as const;

export const VENCIMIENTO_CATEGORIAS = [
  { key: "vencimientos_equipos", label: "Equipos" },
  { key: "vencimientos_personal", label: "Doc. personal" },
  { key: "vencimientos_documentos", label: "Documentos" },
  { key: "vencimientos_elementos_limpieza", label: "Elem. limpieza" },
] as const;

// Claves y etiquetas de los gráficos agrupados
export const VENCIMIENTOS_KEYS_GRAFICO = ["Vigentes", "Próximos a vencer", "Vencidos"];
export const VENCIMIENTOS_LABELS_GRAFICO: Record<string, string> = {
  Vigentes: "Vigentes",
  "Próximos a vencer": "Próximos",
  Vencidos: "Vencidos",
};
export const INCIDENTES_KEYS_GRAFICO = ["Cerrados", "Abiertos"];
export const INCIDENTES_LABELS_GRAFICO: Record<string, string> = {
  Cerrados: "Cerrados",
  Abiertos: "Abiertos",
};

type DatoAgrupado = Record<string, string | number> & { categoria: string };

export const calcularVencimientosTotales = (data: DashboardResponse) => {
  let totalVenc = 0;
  let requieren = 0;

  VENCIMIENTO_KEYS.forEach((k) => {
    const g = data.graficos[k];
    if (g?.datos) {
      g.datos.forEach((d) => {
        totalVenc += d.valor;
        const l = d.label.toLowerCase();
        if (
          l.includes("vencido") ||
          l.includes("próximo") ||
          l.includes("proximo")
        ) {
          requieren += d.valor;
        }
      });
    }
  });

  const pct =
    totalVenc > 0 ? Math.round((requieren / totalVenc) * 100 * 10) / 10 : 0;
  return { pct, requieren, totalVenc };
};

export const construirDatosVencimientosAgrupados = (
  data: DashboardResponse,
): DatoAgrupado[] => {
  return VENCIMIENTO_CATEGORIAS.map((cat) => {
    const graf = data.graficos[cat.key];
    const result: DatoAgrupado = {
      categoria: cat.label,
    };
    if (graf?.datos) {
      graf.datos.forEach((d) => {
        const label = d.label.toLowerCase();
        if (label.includes("vigente")) result["Vigentes"] = d.valor;
        else if (label.includes("próximo") || label.includes("proximo"))
          result["Próximos a vencer"] = d.valor;
        else if (label.includes("vencido")) result["Vencidos"] = d.valor;
        else result[d.label] = d.valor;
      });
    }
    return result;
  });
};

export const construirDatosIncidentesAgrupados = (
  data: DashboardResponse,
): DatoAgrupado[] | null => {
  const grafInc = data.graficos["incidentes"];
  if (!grafInc?.datos || grafInc.datos.length === 0) return null;

  const tiposMap = new Map<string, { abiertos: number; cerrados: number }>();
  grafInc.datos.forEach((d) => {
    const label = d.label;
    if (label.includes(" - Abiertos")) {
      const tipo = label.replace(" - Abiertos", "");
      if (!tiposMap.has(tipo)) tiposMap.set(tipo, { abiertos: 0, cerrados: 0 });
      tiposMap.get(tipo)!.abiertos = d.valor;
    } else if (label.includes(" - Cerrados")) {
      const tipo = label.replace(" - Cerrados", "");
      if (!tiposMap.has(tipo)) tiposMap.set(tipo, { abiertos: 0, cerrados: 0 });
      tiposMap.get(tipo)!.cerrados = d.valor;
    }
  });

  if (tiposMap.size > 0) {
    return Array.from(tiposMap.entries()).map(([tipo, vals]) => ({
      categoria: tipo.length > 20 ? tipo.substring(0, 18) + "..." : tipo,
      Abiertos: vals.abiertos,
      Cerrados: vals.cerrados,
    }));
  }

  return [
    {
      categoria: "Incidentes",
      Abiertos:
        grafInc.datos.find((d) => d.label.toLowerCase().includes("abierto"))
          ?.valor || 0,
      Cerrados:
        grafInc.datos.find((d) => d.label.toLowerCase().includes("cerrado"))
          ?.valor || 0,
    },
  ];
};

export interface DashboardPreparado {
  vencimientosTotales: ReturnType<typeof calcularVencimientosTotales>;
  /** Tarjetas del backend que se muestran aparte de "Vencimientos totales". */
  tarjetas: MetricaCard[];
  datosVencimientosAgrupados: DatoAgrupado[] | null;
  datosIncidentesAgrupados: DatoAgrupado[] | null;
  tieneGraficoIncidentes: boolean;
  /** Gráficos que se dibujan con DashboardChart (tareas, lotes, etc.). */
  graficosAdicionales: Array<[string, GraficoConfig]>;
}

/**
 * Prepara todo lo que muestra el dashboard a partir de la respuesta del backend.
 * La usan la pantalla y el informe imprimible, así ambos muestran exactamente lo mismo.
 */
export const prepararDashboard = (data: DashboardResponse): DashboardPreparado => {
  const hasVencimientos = VENCIMIENTO_KEYS.some((k) => data.graficos[k]);

  return {
    vencimientosTotales: calcularVencimientosTotales(data),
    tarjetas: data.tarjetas.filter((t) => !t.key.startsWith("vencimientos_")),
    datosVencimientosAgrupados: hasVencimientos
      ? construirDatosVencimientosAgrupados(data)
      : null,
    datosIncidentesAgrupados: construirDatosIncidentesAgrupados(data),
    tieneGraficoIncidentes: Boolean(data.graficos["incidentes"]),
    graficosAdicionales: Object.entries(data.graficos).filter(
      ([key]) =>
        !key.startsWith("vencimientos_") &&
        key !== "vencimientos" &&
        key !== "incidentes",
    ),
  };
};

/**
 * Texto del período consultado, para el encabezado del informe.
 * Ej: "01/03/2026 al 31/03/2026", "Desde 01/03/2026" o "Todo el historial".
 */
export const textoPeriodo = (desde?: string | null, hasta?: string | null) => {
  if (desde && hasta) return `${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
  if (desde) return `Desde ${formatearFecha(desde)}`;
  if (hasta) return `Hasta ${formatearFecha(hasta)}`;
  return "Todo el historial";
};

/**
 * Nombre sugerido al guardar el informe como PDF.
 * Ej: "Dashboard SAIA - 01-03-2026 al 31-03-2026".
 */
export const nombreArchivoDashboard = (data: DashboardResponse) =>
  `Dashboard SAIA - ${textoPeriodo(data.desde, data.hasta).replace(/\//g, "-")}`;
