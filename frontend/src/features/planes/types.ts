import type { Equipo } from "../equipos/types";
import type { Sector } from "../sectores/types";

export type Momento = "pre-operacional" | "operacional" | "post-operacional";

export type Periodicidad = "diaria" | "semanal" | "mensual" | "dias-especificos";

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export type DestinoTipo = "equipo" | "sector";

export type EstadoPlan = "borrador" | "vigente" | "dado_de_baja";

export interface TareaLimpieza {
  id: number;
  nombre: string;
  destino_tipo: DestinoTipo;
  equipo?: Equipo;
  sector?: Sector;
  momento: Momento;
  periodicidad: Periodicidad;
  dias: DiaSemana[];
  dia_mes?: number;
  pasos: string[];
  quimicos: string[];
  elementos: string[];
  activo: boolean;
}

export interface PlanPoe {
  id: number;
  nombre_plan: string;
  version: string;
  estado: EstadoPlan;
  fecha_alta: string;
  fecha_baja?: string;
  objetivo?: string;
  descripcion?: string;
}