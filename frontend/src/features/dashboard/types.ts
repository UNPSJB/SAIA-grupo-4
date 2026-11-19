export interface LeyendaItem {
  label: string;
  valor?: number | null;
}

export interface GraficoDato {
  label: string;
  valor: number;
}

export interface GraficoConfig {
  tipo: 'pie' | 'donut' | 'bar';
  datos: GraficoDato[];
  leyendas: LeyendaItem[];
}

export interface MetricaCard {
  key: string;
  titulo: string;
  valor: number;
  unidad: 'porcentaje' | 'cantidad';
  detalle?: string | null;
  link?: string | null;
}

export interface DashboardResponse {
  desde?: string | null;
  hasta?: string | null;
  tarjetas: MetricaCard[];
  graficos: Record<string, GraficoConfig>;
  totales?: Record<string, number> | null;
}

/**
 * Tamaño fijo en píxeles para dibujar un gráfico en modo impresión.
 * Si no se pasa, el gráfico se adapta al ancho de su contenedor (modo pantalla).
 */
export interface TamanoFijo {
  width: number;
  height: number;
}
