export type EstadoHistorial = "completada" | "incumplida";
export type MomentoTarea = "pre-operacional" | "operacional";

export interface AuditoriaHistorial {
  realizadoPor?: string;
  hora?: string;
  fecha: string;
  consumoRegistrado?: string[];
  observacion?: string;
  fotoNombre?: string;
  fotoUrl?: string;
}

export interface TareaHistorialItem {
  id: number;
  nombre: string;
  tipo: MomentoTarea;
  destino: string;
  estado: EstadoHistorial;
  fechaProgramada: string; 
  elementosLimpieza?: string[]; // los elementos de limpieza utilizados
  procedimiento?: string[]; // los pasos poe
  auditoria?: AuditoriaHistorial;
}

export interface MetricasCumplimiento {
  totalTareas: number;
  completadas: number;
  incumplidas: number;
  porcentajeCumplimiento: number;
}