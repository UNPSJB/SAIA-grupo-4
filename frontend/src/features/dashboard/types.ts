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
