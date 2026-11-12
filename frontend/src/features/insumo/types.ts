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
  densidad_g_ml?: number | null;
  peso_unitario_g?: number | null;
  denominacion_rotulo?: string | null;
  clase_funcional?: string | null;
  numero_ins?: string | null;
  denominacion_efectiva?: string;
}