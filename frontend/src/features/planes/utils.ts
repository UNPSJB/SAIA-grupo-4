import type {
  DiaSemana,
  EstadoPlan,
  FrecuenciaPOES,
  Momento,
  Periodicidad,
  PlanCatalogs,
  PlanPOES,
  TareaPOES,
  TipoPOES,
} from "./types";
import { DIAS_SEMANA } from "./constants";

export const DIAS_COMPLETOS: Record<string, string> = {
  lun: "lunes",
  mar: "martes",
  mie: "miercoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sabado",
  dom: "domingo",
};

export const DIAS_ABREVIADOS: Record<string, string> = {
  lunes: "lun",
  martes: "mar",
  miercoles: "mie",
  jueves: "jue",
  viernes: "vie",
  sabado: "sab",
  domingo: "dom",
};

export const momentoToTipoPOES: Record<Momento, TipoPOES> = {
  "pre-operacional": "pre_operacional",
  operacional: "operacional",
  "post-operacional": "post_operacional",
};

export const tipoPOESToMomento: Record<TipoPOES, Momento> = {
  pre_operacional: "pre-operacional",
  operacional: "operacional",
  post_operacional: "post-operacional",
};

export const periodicidadToFrecuencia: Record<Periodicidad, FrecuenciaPOES> = {
  diaria: "diaria",
  semanal: "semanal",
  mensual: "mensual",
  "dias-especificos": "dias_especificos",
};

export const frecuenciaToPeriodicidad: Record<FrecuenciaPOES, Periodicidad> = {
  diaria: "diaria",
  semanal: "semanal",
  mensual: "mensual",
  dias_especificos: "dias-especificos",
};

export const derivarEstado = (plan: PlanPOES): EstadoPlan => {
  if (plan.activo) return "vigente";
  return plan.fecha_hasta ? "archivado" : "borrador";
};

export const formatFecha = (fecha?: string) =>
  fecha ? fecha.slice(0, 10) : "—";

const labelDiaAbrev = (abrev: string) =>
  DIAS_SEMANA.find((x) => x.value === abrev)?.label ?? abrev;

export const labelDiaCompleto = (completo: string) => {
  const abrev = DIAS_ABREVIADOS[completo.trim().toLowerCase()];
  return abrev ? labelDiaAbrev(abrev) : undefined;
};

export const labelsDias = (dias: string[]) =>
  dias
    .map((d) => DIAS_SEMANA.find((x) => x.value === d)?.label ?? d)
    .join(", ") || "—";

export const formatMomento = (momento: TipoPOES) => {
  if (momento === "pre_operacional") return "Pre-operacional";
  if (momento === "operacional") return "Operacional";
  return "Post-operacional";
};

export const formatFrecuencia = (tarea: TareaPOES) => {
  switch (tarea.frecuencia) {
    case "diaria":
      return "Diaria";
    case "semanal":
      return tarea.detalle_frecuencia
        ? `Semanal (${labelDiaCompleto(tarea.detalle_frecuencia) ?? tarea.detalle_frecuencia})`
        : "Semanal";
    case "mensual":
      return tarea.detalle_frecuencia
        ? `Mensual (día ${tarea.detalle_frecuencia})`
        : "Mensual";
    case "dias_especificos":
      return (
        (tarea.detalle_frecuencia ?? "")
          .split(",")
          .map((d) => d.trim())
          .map(labelDiaAbrev)
          .join(", ") || "—"
      );
  }
};

export const parsearDetalleFrecuencia = (
  frecuencia: FrecuenciaPOES,
  detalle?: string,
): { dias: string[]; dia_mes?: number } => {
  if (frecuencia === "semanal") {
    const abrev = detalle
      ? DIAS_ABREVIADOS[detalle.trim().toLowerCase()]
      : undefined;
    return { dias: abrev ? [abrev] : [], dia_mes: undefined };
  }
  if (frecuencia === "mensual") {
    const mes = detalle ? Number(detalle) : undefined;
    return {
      dias: [],
      dia_mes: Number.isFinite(mes ?? NaN) ? mes : undefined,
    };
  }
  if (frecuencia === "dias_especificos") {
    const abrevs = (detalle ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    return { dias: abrevs as DiaSemana[], dia_mes: undefined };
  }
  return { dias: [], dia_mes: undefined };
};

export const colorFrecuencia: Record<FrecuenciaPOES, string> = {
  diaria: "blue",
  semanal: "orange",
  mensual: "purple",
  dias_especificos: "teal",
};

export const getDestinoLabel = (tarea: TareaPOES, catalogs: PlanCatalogs) => {
  if (tarea.equipo_id) {
    const equipo = catalogs.equipos.find((e) => e.id === tarea.equipo_id);
    return `Equipo: ${equipo?.nombre ?? "—"}`;
  }
  if (tarea.sector_id) {
    const sector = catalogs.sectores.find((s) => s.id === tarea.sector_id);
    return `Sector: ${sector?.nombre ?? "—"}`;
  }
  return "—";
};

export const getDestinoDetalle = (tarea: TareaPOES, catalogs: PlanCatalogs) => {
  if (tarea.equipo_id) {
    const equipo = catalogs.equipos.find((e) => e.id === tarea.equipo_id);
    return `${equipo?.nombre ?? "—"} (${equipo?.sector?.nombre ?? "Sin sector"}${equipo?.ubicacion ? " / " + equipo?.ubicacion : ""})`;
  }
  if (tarea.sector_id) {
    const sector = catalogs.sectores.find((s) => s.id === tarea.sector_id);
    return sector?.nombre ?? "—";
  }
  return "—";
};

export const getInsumosLabel = (tarea: TareaPOES, catalogs: PlanCatalogs) =>
  tarea.insumos_quimicos
    .map(
      (iq) =>
        catalogs.insumosQuimicos.find((c) => c.id === iq.insumo_quimico_id)
          ?.nombre ?? `Insumo ${iq.insumo_quimico_id}`,
    )
    .join(", ") || "—";

export const getElementosLabel = (tarea: TareaPOES, catalogs: PlanCatalogs) =>
  tarea.elementos_limpieza
    .map(
      (el) =>
        catalogs.elementosLimpieza.find((c) => c.id === el.elemento_limpieza_id)
          ?.nombre ?? `Elemento ${el.elemento_limpieza_id}`,
    )
    .join(", ") || "—";

export const getRecursosLabel = (tarea: TareaPOES, catalogs: PlanCatalogs) => {
  const partes = [
    getInsumosLabel(tarea, catalogs),
    getElementosLabel(tarea, catalogs),
  ].filter((p) => p !== "—");
  return partes.length ? partes.join(", ") : "—";
};

export const getResumenTareas = (tareas: TareaPOES[]) => {
  const activas = tareas.filter((t) => t.activo).length;
  const diarias = tareas.filter(
    (t) => t.activo && t.frecuencia === "diaria",
  ).length;
  const semanales = tareas.filter(
    (t) =>
      t.activo &&
      (t.frecuencia === "semanal" || t.frecuencia === "dias_especificos"),
  ).length;
  const mensuales = tareas.filter(
    (t) => t.activo && t.frecuencia === "mensual",
  ).length;
  return { activas, diarias, semanales, mensuales };
};
