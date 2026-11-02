import type { UnidadMedida } from "../unidadMedida/types";

export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    dias_vida_util?: number | null;
    activo: boolean;
}

export type ProductoCreate = {
    nombre: string;
    descripcion: string;
    unidad_medida_id: number;
    dias_vida_util?: number | null;
};
