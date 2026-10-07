import type { Persona } from "../personal/types"; 

export interface Incidente {
    id: number;
    titulo: string;
    descripcion: string;
    foto?: string | null;
    fecha_hora_reporte: string;
    reportante_id: number; // ID del usuario que reportó el incidente
    reportante: {
        id: number;
        nombre: string;
        apellido: string;
    }; // Información del usuario que reportó el incidente
    abierto: boolean;
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