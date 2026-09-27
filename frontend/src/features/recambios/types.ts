import type { ElementoLimpieza } from "../elementosLimpieza/types";

// Semáforo calculado por el backend (GET /recambios/alertas).
// No confundir con "activo" del elemento (columna Estado del listado).
export type EstadoRecambio = "vencido" | "proximo" | "al_dia";

export interface AlertaRecambio {
    elemento: ElementoLimpieza;
    proxima_fecha: string; // "YYYY-MM-DD"
    dias_restantes: number;
    estado: EstadoRecambio;
}

export interface Recambio {
    id: number;
    elemento_id: number;
    fecha_recambio: string;
    observaciones?: string | null;
}
