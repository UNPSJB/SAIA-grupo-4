// Contratos de la vista publica de cumplimiento.
//
// La vista publica tiene un contrato propio y deliberadamente acotado: solo
// expone metricas agregadas y positivas. No reutiliza `DashboardResponse` para
// evitar que datos internos (incidentes, links, detalles) se filtren al
// frontend publico.
//
// Los indicadores apagados por el administrador no llegan en la respuesta, por
// eso las secciones de `IndicadoresPublicos` son opcionales.

export interface IndicadorCatalogo {
  clave: string;
  nombre: string;
  descripcion: string;
  por_defecto: boolean;
  sensible: boolean;
  activo: boolean;
}

export interface EstadoVistaPublica {
  activo: boolean;
  token: string;
  indicadores: IndicadorCatalogo[];
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
  // El resumen general puede apagarse sin apagar las tarjetas por categoría.
  al_dia?: number | null;
  total?: number | null;
  porcentaje_al_dia?: number | null;
  por_categoria?: CategoriaVencimientosPublica[] | null;
}

export interface IncidentesPublicos {
  total: number;
  abiertos: number;
  cerrados: number;
  porcentaje_cerrados: number;
}

export interface IndicadoresPublicos {
  periodo: PeriodoPublico;
  metricas?: MetricasPublicas | null;
  vencimientos?: VencimientosPublicos | null;
  incidentes?: IncidentesPublicos | null;
}

export interface RespuestaIndicadoresPublicos {
  activo: boolean;
  mensaje?: string | null;
  indicadores?: IndicadoresPublicos | null;
}
