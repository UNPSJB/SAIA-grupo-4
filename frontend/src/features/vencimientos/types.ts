// Espejo de backend/src/vencimientos/schemas.py.
export type EstadoVencimiento = "vencido" | "proximo" | "vigente";

export type FiltroEstadoVencimiento = EstadoVencimiento | "por_vencer";

export type CategoriaVencimiento =
  | "personal"
  | "equipo"
  | "elemento_limpieza"
  | "documento";

export interface Vencimiento {
  // Clave estable "categoria:entidad_id". No es el id de la tabla de origen:
  // cuando entren filas de varios modulos, dos registros distintos pueden
  // compartir el mismo entero.
  id: string;
  categoria: CategoriaVencimiento;
  concepto: string;
  entidad: string;
  entidad_id: number;
  fecha_vencimiento: string; // "YYYY-MM-DD"
  dias_restantes: number; // Negativo si ya vencio
  estado: EstadoVencimiento;
  detalle?: string | null;
  ruta_detalle: string;
}

export interface CategoriaDisponible {
  valor: CategoriaVencimiento;
  nombre: string;
  total: number;
}
