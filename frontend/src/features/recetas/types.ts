export type EstadoReceta = "BORRADOR" | "ACTIVA" | "INHABILITADA";

export interface Receta {
  id: number;
  codigo_receta: string;
  nombre_receta: string;
  producto_id: number;
  rendimiento_estandar: number;
  tiempo_estimado_total?: number;
  estado: EstadoReceta;
  observaciones?: string;
  fecha_creacion: string;
  usuario_creador_id: number;
  usuario_creador_nombre?: string;
  tiene_lotes?: boolean;
  pasos?: any[];
}

export interface RecetaCreatePayload {
  nombre_receta: string;
  producto_id: number;
  rendimiento_estandar: number;
  tiempo_estimado_total?: number;
  observaciones?: string;
}

export interface RecetaUpdatePayload {
  nombre_receta?: string;
  rendimiento_estandar?: number;
  tiempo_estimado_total?: number;
  observaciones?: string;
}
