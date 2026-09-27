// Las ejecuciones del historial usan el mismo contrato que el checklist del día
// (GET /checklists/historial responde con schemas.EjecucionTarea), así que el tipo
// se importa desde features/checklists/types en lugar de duplicarse aquí.

export interface MetricasCumplimiento {
  totalTareas: number;
  completadas: number;
  incumplidas: number;
  porcentajeCumplimiento: number;
}
