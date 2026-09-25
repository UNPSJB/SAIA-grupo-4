import type { UnidadMedida } from "../unidadMedida/types";

export interface InsumoQuimico {
    id: number;
    nombre: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    consumo: number;
    tipo: string;
    equipo?: { id: number; nombre: string} | null;
    sector?: { id: number; nombre: string} | null;
    activo: boolean;
}