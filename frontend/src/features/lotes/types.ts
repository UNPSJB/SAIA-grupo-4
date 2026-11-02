export interface ConsumoInsumoCreate {
  insumo_id: number;
  cantidad_real_utilizada: number;
}

export interface ConsumoInsumo {
  id: number;
  insumo_id: number;
  insumo_nombre: string;
  unidad_medida_simbolo: string;
  cantidad_teorica: number;
  cantidad_real_utilizada: number;
}

export interface InsumoTeoricoReceta {
  insumo_id: number;
  nombre: string;
  unidad_medida_simbolo: string;
  cantidad_nominal_receta: number;
}

export interface ProductoDisponibleLote {
  id: number;
  nombre: string;
  descripcion: string;
  unidad_medida_simbolo: string;
  dias_vida_util?: number | null;
  receta_id: number;
  receta_codigo: string;
  receta_nombre: string;
  rendimiento_estandar: number | string;
  insumos_teoricos: InsumoTeoricoReceta[];
}

export interface LoteCreatePayload {
  producto_id: number;
  codigo_lote?: string;
  fecha_elaboracion: string;
  fecha_vencimiento: string;
  cantidad_producida: number;
  observaciones?: string;
  consumos: ConsumoInsumoCreate[];
}

export interface Lote {
  id: number;
  codigo_lote: string;
  producto_id: number;
  receta_id: number;
  operador_id: number;
  fecha_elaboracion: string;
  fecha_vencimiento: string;
  fecha_registro_sistema: string;
  cantidad_producida: number;
  observaciones?: string | null;

  producto_nombre?: string;
  unidad_medida_simbolo?: string;
  receta_codigo?: string;
  receta_nombre?: string;
  operador_nombre?: string;

  consumos_insumos: ConsumoInsumo[];
}

export type LoteCreate = LoteCreatePayload;
