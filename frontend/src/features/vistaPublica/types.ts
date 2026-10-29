// Contratos de la vista publica de cumplimiento.
//
// La vista publica tiene un contrato propio y deliberadamente acotado: solo
// expone metricas agregadas y positivas. No reutiliza `DashboardResponse` para
// evitar que datos internos (incidentes, links, detalles) se filtren al
// frontend publico.

export interface EstadoVistaPublica {
  activo: boolean;
  token: string;
}

export interface PeriodoPublico {
  desde: string;
  hasta: string;
}

export interface MetricasPublicas {
  porcentaje_cumplimiento: number;
  tareas_completadas: number;
  tareas_totales: number;
}

export interface CategoriaVencimientosPublica {
  nombre: string;
  al_dia: number;
  total: number;
  porcentaje_al_dia: number;
}

export interface VencimientosPublicos {
  al_dia: number;
  total: number;
  porcentaje_al_dia: number;
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
