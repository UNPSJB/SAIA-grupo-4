import type { Sector } from "../sectores/types";

export type EstadoCalibracion = "vencido" | "proximo" | "al_dia";

export interface Equipo {
  id: number;
  nombre: string;
  marca: string;
  numero_serie: string;
  categoria: string;
  ubicacion?: string;
  sector: Sector;
  activo: boolean;
}

export interface Equipo {
  id: number;
  nombre: string;
  marca: string;
  numero_serie: string;
  categoria: string;
  ubicacion?: string;
  sector: Sector;
  activo: boolean;
  frecuencia_calibracion_dias?: number | null;
  fecha_ultima_calibracion?: string | null;
}

export interface EquipoPayload {
  nombre: string;
  marca: string;
  numero_serie: string;
  categoria: string;
  sector_id: number;
  ubicacion?: string;
  frecuencia_calibracion_dias?: number | null;
  fecha_ultima_calibracion?: string | null;
}