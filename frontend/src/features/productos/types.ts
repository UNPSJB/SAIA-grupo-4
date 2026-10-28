export interface Producto {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface ProductoCreate {
  nombre: string;
}