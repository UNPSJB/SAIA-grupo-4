import type { Sector } from "../sectores/types";

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