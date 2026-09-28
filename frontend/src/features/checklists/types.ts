// Contrato con el backend, replicando 1:1 los schemas de
// backend/src/checklists/schemas.py. Las estructuras se mantienen anidadas y en
// snake_case (igual que el resto de las features ya conectadas: equipos, personal,
// sectores) para no inventar una segunda forma de dato.

// src/checklists/constants.py -> EstadoEjecucion
export type EstadoEjecucion = "PENDIENTE" | "COMPLETADA" | "NO_REALIZADA";

// src/plan_poes/schemas.py -> TipoPOES
export type TipoPoes =
  | "pre_operacional"
  | "operacional"
  | "post_operacional";

export interface RecursoChecklist {
  id: number;
  nombre: string;
}

export interface OperadorChecklist {
  id: number;
  nombre: string;
  apellido: string;
}

export interface UnidadMedidaChecklist {
  simbolo: string;
}

export interface InsumoBaseChecklist {
  id: number;
  nombre: string;
  unidad_medida: UnidadMedidaChecklist;
}

export interface InsumoParaChecklist {
  insumo_quimico: InsumoBaseChecklist;
  dosis_sugerida: number | null;
  dilucion_especifica: string | null;
}

export interface ElementoParaChecklist {
  elemento_limpieza: RecursoChecklist;
  cantidad_requerida: number;
}

export interface TareaParaChecklist {
  id: number;
  nombre: string;
  tipo_poes: TipoPoes;
  // El método llega como un único texto multilínea; el índice se separa por "\n".
  metodo: string;
  equipo: RecursoChecklist | null;
  sector: RecursoChecklist | null;
  insumos_quimicos: InsumoParaChecklist[];
  elementos_limpieza: ElementoParaChecklist[];
}

export interface ConsumoEjecucionChecklist {
  insumo_quimico_id: number;
  cantidad_utilizada: number;
}

// Respuesta de GET /checklists/hoy, GET /checklists/historial y
// PATCH /checklists/{id}/completar.
export interface EjecucionTarea {
  id: number;
  id_tarea: number;
  fecha_programada: string;
  estado: EstadoEjecucion;
  fecha_hora_ejecucion: string | null;
  operador_id: number | null;
  operador: OperadorChecklist | null;
  // Ruta relativa servida por el backend, p.ej. "uploads/evidencias/tarea_1_...jpg".
  foto_url: string | null;
  observaciones: string | null;
  tarea: TareaParaChecklist;
  consumos_insumos: ConsumoEjecucionChecklist[];
}

// Cuerpo del campo "datos" (JSON) del PATCH /checklists/{id}/completar.
export interface RegistroConsumoQuimico {
  insumo_quimico_id: number;
  cantidad_utilizada: number | null;
}

export interface CompletarEjecucion {
  operador_id: number;
  observaciones?: string | null;
  consumos: RegistroConsumoQuimico[];
}
