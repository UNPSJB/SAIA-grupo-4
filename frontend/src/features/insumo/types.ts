export interface FormValues {
  nombre: string;
  unidad_medida: string;
  categoria: string;
  descripcion: string;
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad_medida: string;
  categoria: string;
  descripcion: string;
  disponible: boolean;
}
