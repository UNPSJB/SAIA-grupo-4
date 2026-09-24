import type { TareaLimpieza } from "./types";
import { DIAS_SEMANA } from "./constants";

const labelDia = (dia?: string) =>
  dia ? DIAS_SEMANA.find((x) => x.value === dia)?.label ?? dia : undefined;

export const formatMomento = (momento: TareaLimpieza["momento"]) => {
  if (momento === "pre-operacional") return "Pre-operacional";
  if (momento === "operacional") return "Operacional";
  return "Post-operacional";
};

export const formatFrecuencia = (tarea: TareaLimpieza) => {
  switch (tarea.periodicidad) {
    case "diaria":
      return "Diaria";
    case "semanal":
      return labelDia(tarea.dias[0])
        ? `Semanal (${labelDia(tarea.dias[0])})`
        : "Semanal";
    case "mensual":
      return tarea.dia_mes ? `Mensual (día ${tarea.dia_mes})` : "Mensual";
    case "dias-especificos":
      return (
        tarea.dias
          .map((d) => DIAS_SEMANA.find((x) => x.value === d)?.label ?? d)
          .join(", ") || "—"
      );
  }
};

export const getDestinoLabel = (tarea: TareaLimpieza) =>
  tarea.destino_tipo === "equipo"
    ? `Equipo: ${tarea.equipo?.nombre ?? "—"}`
    : `Sector: ${tarea.sector?.nombre ?? "—"}`;

export const getDestinoDetalle = (tarea: TareaLimpieza) => {
  if (tarea.destino_tipo === "equipo" && tarea.equipo) {
    const { sector, ubicacion } = tarea.equipo;
    return `${tarea.equipo.nombre} (${sector?.nombre ?? "Sin sector"}${ubicacion ? " / " + ubicacion : ""})`;
  }
  return tarea.sector?.nombre ?? "—";
};

export const getRecursosLabel = (tarea: TareaLimpieza) =>
  [...tarea.quimicos, ...tarea.elementos].join(", ") || "—";

export const getResumenTareas = (tareas: TareaLimpieza[]) => {
  const activas = tareas.filter((t) => t.activo).length;
  const diarias = tareas.filter(
    (t) => t.activo && t.periodicidad === "diaria",
  ).length;
  const semanales = tareas.filter(
    (t) =>
      t.activo &&
      (t.periodicidad === "semanal" || t.periodicidad === "dias-especificos"),
  ).length;
  const mensuales = tareas.filter(
    (t) => t.activo && t.periodicidad === "mensual",
  ).length;
  return { activas, diarias, semanales, mensuales };
};