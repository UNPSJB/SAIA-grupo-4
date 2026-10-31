export interface InsumoLoteDetalle {
  id: number;
  lote_id: number;
  insumo_id: number;
  cantidad: number;
  insumo?: {
    id: number;
    nombre: string;
    unidad_medida?: {
      simbolo: string;
    };
  };
}

export interface Lote {
  id: number;
  producto_id: number;
  producto?: {
    id: number;
    nombre: string;
  };
  fecha: string;
  cantidad: number;
  insumos_asociados?: InsumoLoteDetalle[];
}