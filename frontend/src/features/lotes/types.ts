export interface LoteInsumoDisponible {
  id: number;
  insumo_id: number;
  codigo_lote: string;
  fecha_vencimiento: string;
  cantidad_inicial: number;
  cantidad_actual: number;
}

export interface DetalleLoteInsumoCreate {
  lote_insumo_id: number;
  cantidad: number;
  unidad?: string;
}

export interface DetalleLoteInsumo {
  id: number;
  lote_insumo_id: number;
  codigo_lote_insumo: string;
  fecha_vencimiento: string;
  cantidad: number;
}

export interface ConsumoInsumoCreate {
  insumo_id: number;
  cantidad_real_utilizada: number;
  unidad?: string;
  lotes: DetalleLoteInsumoCreate[];
}

export interface ConsumoInsumo {
  id: number;
  insumo_id: number;
  insumo_nombre: string;
  unidad_medida_simbolo: string;
  cantidad_teorica: number;
  cantidad_real_utilizada: number;
  detalles_lotes: DetalleLoteInsumo[];
}

export interface InsumoTeoricoReceta {
  insumo_id: number;
  nombre: string;
  unidad_medida_simbolo: string;
  unidad_medida_tipo?: string | null;
  cantidad_nominal_receta: number;
  lotes_disponibles: LoteInsumoDisponible[];
}

export interface ProductoDisponibleLote {
  id: number;
  nombre: string;
  descripcion: string;
  unidad_medida_simbolo: string;
  unidad_medida_tipo?: string | null;
  dias_vida_util?: number | null;
  receta_id: number;
  receta_codigo: string;
  receta_nombre: string;
  receta_version?: number;
  rendimiento_estandar: number | string;
  tamano_porcion?: number | string | null;
  insumos_teoricos: InsumoTeoricoReceta[];
}

export interface LoteCreatePayload {
  producto_id: number;
  codigo_lote?: string;
  fecha_elaboracion: string;
  fecha_vencimiento: string;
  masa_tanda_g?: number;
  cantidad_producida: number;
  observaciones?: string;
  consumos: ConsumoInsumoCreate[];
}

export type EstadoLoteProduccion = "activo" | "vencido" | "retenido";

export interface PersonalResumen {
  id: number;
  nombre: string;
  apellido: string;
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

  estado: EstadoLoteProduccion;
  motivo_retencion?: string | null;
  fecha_retencion?: string | null;
  usuario_retencion_id?: number | null;
  usuario_retencion?: PersonalResumen | null;

  producto_nombre?: string;
  unidad_medida_simbolo?: string;
  receta_codigo?: string;
  receta_nombre?: string;
  operador_nombre?: string;

  consumos_insumos: ConsumoInsumo[];
}

export type LoteCreate = LoteCreatePayload;
