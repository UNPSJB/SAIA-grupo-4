import type { Persona } from "../personal/types"; 

export interface TipoIncidente {
    id: number;
    nombre: string;
    descripcion: string;
    activo: boolean;
}

export interface Incidente {
    id: number;
    titulo: string;
    descripcion: string;
    foto_url?: string | null;
    fecha_hora_reporte: string;
    reportante_id: number; // ID del usuario que reportó el incidente
    reportante: {
        id: number;
        nombre: string;
        apellido: string;
    }; // Información del usuario que reportó el incidente
    tipo_id: number; // ID del tipo de incidente
    tipo: TipoIncidente; // Objeto del tipo de incidente

    // Faltaba tras el merge
    accion_correctiva?: string | null;
    fecha_cierre?: string | null;
    responsable_cierre_id?: number | null;
    responsable_cierre?: Persona | null;

    abierto: boolean;
}

export interface EstadisticaTipoIncidente {
  tipo_id: number;
  tipo: string;
  cantidad: number;
}

export interface HistorialIncidente {
  id: number;
  incidente_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  motivo: string;
  fecha: string;
  responsable_id: number;
  responsable?: Persona | null;
}