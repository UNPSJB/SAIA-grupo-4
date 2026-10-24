import type { UnidadMedida } from "../unidadMedida/types";

export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    activo: boolean;
}