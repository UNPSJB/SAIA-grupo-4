// Contratos de la vista pública de cumplimiento.
//
// La vista pública tiene un contrato propio y deliberadamente acotado: solo
// expone métricas agregadas. No reutiliza `DashboardResponse` para evitar que
// datos internos (incidentes, links, detalles) se filtren al frontend público.

export interface EstadoVistaPublica {
  activo: boolean;
  token: string;
}

export interface PeriodoPublico {
  desde: string;
  hasta: string;
}

export interface MetricasPublicas {
  total_tareas: number;
  completadas: number;
  incumplidas: number;
  porcentaje_cumplimiento: number;
}

export interface CategoriaVencimientosPublica {
  categoria: string;
  nombre: string;
  total: number;
  vigentes: number;
  proximos: number;
  vencidos: number;
}

export interface VencimientosPublicos {
  total: number;
  vigentes: number;
  proximos: number;
  vencidos: number;
  por_categoria: CategoriaVencimientosPublica[];
}

export interface IndicadoresPublicos {
  periodo: PeriodoPublico;
  metricas: MetricasPublicas;
  vencimientos: VencimientosPublicos;
}

export interface RespuestaIndicadoresPublicos {
  activo: boolean;
  mensaje: string | null;
  indicadores: IndicadoresPublicos | null;
}
