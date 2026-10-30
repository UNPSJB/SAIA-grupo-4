export type EstadoReceta = "BORRADOR" | "ACTIVA" | "INHABILITADA";

export interface EquipoResumen {
  id: number;
  nombre: string;
  activo?: boolean;
}

export interface InsumoResumen {
  id: number;
  nombre: string;
  unidad_medida: string;
  disponible?: boolean;
}

export interface PasoEquipo {
  id: number;
  paso_id: number;
  equipo_id: number;
  cantidad: number;
  equipo: EquipoResumen;
}

export interface PasoInsumo {
  id: number;
  paso_id: number;
  insumo_id: number;
  cantidad_consumo_estimada: number;
  insumo: InsumoResumen;
}

export interface PasoReceta {
  id: number;
  receta_id: number;
  numero_orden: number;
  titulo: string;
  instrucciones: string;
  equipos: PasoEquipo[];
  insumos: PasoInsumo[];
}

export interface PasoEquipoCreatePayload {
  equipo_id: number;
  cantidad: number;
}

export interface PasoInsumoCreatePayload {
  insumo_id: number;
  cantidad_consumo_estimada: number;
}

export interface PasoRecetaCreatePayload {
  numero_orden: number;
  titulo: string;
  instrucciones: string;
  equipos: PasoEquipoCreatePayload[];
  insumos: PasoInsumoCreatePayload[];
}

export interface PasoRecetaUpdatePayload {
  numero_orden?: number;
  titulo?: string;
  instrucciones?: string;
  equipos?: PasoEquipoCreatePayload[];
  insumos?: PasoInsumoCreatePayload[];
}

import type { UnidadMedida } from "../unidadMedida/types";

export interface ProductoResumen {
  id: number;
  nombre: string;
  activo: boolean;
  unidad_medida?: UnidadMedida;
}

export interface Receta {
  id: number;
  codigo_receta: string;
  nombre_receta: string;
  producto_id: number;
  producto?: ProductoResumen;
  rendimiento_estandar: number;
  tiempo_estimado_total?: number;
  estado: EstadoReceta;
  observaciones?: string;
  fecha_creacion: string;
  fecha_baja?: string;
  usuario_creador_id: number;
  usuario_creador_nombre?: string;
  tiene_lotes?: boolean;
  pasos?: PasoReceta[];
}

export interface FiltrosReceta {
  busqueda?: string;
  estado?: string;
  insumo_id?: number | string;
  equipo_id?: number | string;
  producto_id?: number | string;
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

