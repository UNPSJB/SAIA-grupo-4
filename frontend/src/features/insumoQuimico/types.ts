export interface UnidadMedida {
    id: number;
    nombre: string;
    simbolo: string;
    tipo_magnitud: string;
    disponible: boolean;
}

export interface InsumoQuimico {
    id: number;
    nombre: string;
    unidad_medida_id: number;
    unidad_medida: UnidadMedida;
    tipo: string;
    activo: boolean;
}