import type { Equipo } from "../equipos/types";
import type { Sector } from "../sectores/types";
import type { Persona } from "../personal/types";
import type { UnidadMedida } from "../unidadMedida/types";

export type Momento = "pre-operacional" | "operacional" | "post-operacional";

export type Periodicidad =
  | "diaria"
  | "semanal"
  | "mensual"
  | "dias-especificos";

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export type DestinoTipo = "equipo" | "sector";

export type TipoPOES = "pre_operacional" | "operacional" | "post_operacional";

export type FrecuenciaPOES =
  | "diaria"
  | "semanal"
  | "mensual"
  | "dias_especificos";

export type EstadoPlan = "borrador" | "vigente" | "archivado";

export interface InsumoQuimicoCatalogo {
  id: number;
  nombre: string;
  tipo: string;
  unidad_medida_id: number;
  unidad_medida?: UnidadMedida;
  activo: boolean;
}

export interface ElementoLimpiezaCatalogo {
  id: number;
  nombre: string;
  frecuencia_recambio_dias?: number;
  activo: boolean;
}

export interface TareaInsumoQuimico {
  id?: number;
  tarea_id?: number;
  insumo_quimico_id: number;
  dosis_sugerida?: number;
  dilucion_especifica?: string;
}

export interface TareaElementoLimpieza {
  id?: number;
  tarea_id?: number;
  elemento_limpieza_id: number;
  cantidad_requerida: number;
}

export interface TareaPOES {
  id: number;
  plan_id: number;
  nombre: string;
  tipo_poes: TipoPOES;
  frecuencia: FrecuenciaPOES;
  detalle_frecuencia?: string;
  equipo_id?: number;
  sector_id?: number;
  metodo: string;
  activo: boolean;
  insumos_quimicos: TareaInsumoQuimico[];
  elementos_limpieza: TareaElementoLimpieza[];
  equipo?: Equipo;
  sector?: Sector;
}

export interface PlanPOES {
  id: number;
  nombre: string;
  objetivo?: string;
  elaborado_por_id: number;
  fecha_emision?: string;
  fecha_hasta?: string;
  activo: boolean;
  tareas?: TareaPOES[];
}

export interface PlanCatalogs {
  personas: Persona[];
  equipos: Equipo[];
  sectores: Sector[];
  insumosQuimicos: InsumoQuimicoCatalogo[];
  elementosLimpieza: ElementoLimpiezaCatalogo[];
}
