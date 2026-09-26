export interface TipoElementoLimpieza {
    id: number;
    nombre: string;
    prefijo: string;
    activo: boolean;
}

export interface Sector {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface Equipo {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface ElementoLimpieza {
    id: number;
    codigo: string;
    nombre: string;
    tipo_id: number;
    tipo: TipoElementoLimpieza;
    sector_id?: number | null;
    sector?: Sector | null;
    equipo_id?: number | null;
    equipo?: Equipo | null;
    frecuencia_recambio_dias?: number | null;
    fecha_ultimo_recambio?: string | null;
    activo: boolean;
}