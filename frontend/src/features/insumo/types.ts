export interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  tipo_magnitud: string;
  disponible: boolean;
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad_medida_id: number;
  unidad_medida: UnidadMedida;
  consumo: number;
  categoria: string;
  descripcion: string;
  disponible: boolean;
}

export interface LoteInsumo {
  id: number;
  insumo_id: number;
  codigo_lote: string;
  fecha_vencimiento: string; // "YYYY-MM-DD"
  activo: boolean;
}