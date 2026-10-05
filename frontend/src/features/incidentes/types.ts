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