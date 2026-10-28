import type { Producto } from "../productos/types";

export interface Lote {
  id: number;
  producto_id: number;
  fecha: string; 
  cantidad: number;
  producto: Producto; 
}

export interface LoteCreate {
  producto_id: number;
  fecha: string;
  cantidad: number;
}