export type EstadoVencimientoOperabilidad =
  | "vigente"
  | "proximo"
  | "vencido"
  | "sin_configurar";

export interface AsociacionOperativa {
  tipo: string;
  id: number;
  nombre: string;
  detalle?: string | null;
  ruta?: string | null;
}

export interface AlertaRecursoNoOperable {
  tipo: string;
  id: number;
  nombre: string;
  estado_vencimiento: EstadoVencimientoOperabilidad;
  motivos: string[];
  ruta: string;
}

export interface CamposOperabilidad {
  operable?: boolean;
  estado_vencimiento?: EstadoVencimientoOperabilidad;
  motivos_no_operables?: string[];
  tipo_baja?: string | null;
  motivo_baja?: string | null;
  fecha_baja?: string | null;
  advertencias_asociaciones?: AsociacionOperativa[];
}

export const ETIQUETA_ESTADO_VENCIMIENTO: Record<
  EstadoVencimientoOperabilidad,
  string
> = {
  vigente: "Vigente",
  proximo: "Próximo a vencer",
  vencido: "Vencido",
  sin_configurar: "Sin configurar",
};

export const extraerDetalleBaja = (
  detail: unknown,
  fallback: string,
): { mensaje: string; asociaciones: AsociacionOperativa[] } => {
  if (typeof detail === "string") {
    return { mensaje: detail, asociaciones: [] };
  }
  if (detail && typeof detail === "object") {
    const obj = detail as {
      code?: unknown;
      asociaciones?: unknown;
    };
    const asociaciones = Array.isArray(obj.asociaciones)
      ? (obj.asociaciones as AsociacionOperativa[])
      : [];
    const base = typeof obj.code === "string" ? obj.code : fallback;
    return { mensaje: base, asociaciones };
  }
  return { mensaje: fallback, asociaciones: [] };
};