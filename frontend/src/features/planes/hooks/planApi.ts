import type { Equipo } from "../../equipos/types";
import type { Sector } from "../../sectores/types";
import type { Persona } from "../../personal/types";
import type {
  ElementoLimpiezaCatalogo,
  InsumoQuimicoCatalogo,
  PlanPOES,
  TareaPOES,
} from "../types";

const BASE_URL = "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function extraerMensaje(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.detail) {
      if (typeof body.detail === "string") return body.detail;
      if (
        typeof body.detail === "object" &&
        typeof body.detail.code === "string"
      ) {
        return body.detail.code;
      }
      if (Array.isArray(body.detail)) {
        const msgs = body.detail
          .map((d: { msg?: string }) => d.msg)
          .filter(Boolean);
        if (msgs.length) return msgs.join("; ");
      }
    }
  } catch {
    // Si no se puede parsear el JSON, se usa el mensaje genérico
  }
  switch (res.status) {
    case 400:
      return "Datos inválidos enviados al servidor.";
    case 404:
      return "El recurso no fue encontrado.";
    case 409:
      return "Conflicto con los datos ingresados.";
    case 422:
      return "Datos inválidos enviados al servidor.";
    case 500:
      return "Error interno del servidor.";
    default:
      return `Error ${res.status || "desconocido"}`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
  } catch {
    throw new Error(
      "Ocurrió un error de red al intentar comunicarse con el servidor.",
    );
  }
  if (!res.ok) {
    throw new ApiError(res.status, await extraerMensaje(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface TareaInsumoQuimicoPayload {
  insumo_quimico_id: number;
  dosis_sugerida?: number;
  dilucion_especifica?: string;
}

export interface TareaElementoLimpiezaPayload {
  elemento_limpieza_id: number;
  cantidad_requerida: number;
}

export interface TareaPOESPayload {
  nombre: string;
  tipo_poes: TareaPOES["tipo_poes"];
  frecuencia: TareaPOES["frecuencia"];
  detalle_frecuencia?: string;
  equipo_id?: number;
  sector_id?: number;
  metodo: string;
}

export interface TareaPOESCreatePayload extends TareaPOESPayload {
  insumos_quimicos: TareaInsumoQuimicoPayload[];
  elementos_limpieza: TareaElementoLimpiezaPayload[];
}

export const planesApi = {
  obtenerPlanActivo: () => request<PlanPOES>("/planes-poes/activo"),
  obtenerBorrador: () => request<PlanPOES>("/planes-poes/borrador"),
  listarPlanes: () => request<PlanPOES[]>("/planes-poes/"),
  obtenerPlan: (id: number) => request<PlanPOES>(`/planes-poes/${id}`),
  crearPlan: (payload: {
    nombre: string;
    objetivo?: string;
    elaborado_por_id: number;
  }) =>
    request<PlanPOES>("/planes-poes/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  modificarPlan: (
    id: number,
    payload: { nombre?: string; objetivo?: string },
  ) =>
    request<PlanPOES>(`/planes-poes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  activarPlan: (id: number) =>
    request<PlanPOES>(`/planes-poes/${id}/activar`, { method: "POST" }),
  archivarPlan: (id: number) =>
    request<PlanPOES>(`/planes-poes/${id}/archivar`, { method: "POST" }),
  descartarBorrador: (id: number) =>
    request<void>(`/planes-poes/${id}/descartar`, { method: "DELETE" }),
  clonarPlan: (id: number, elaborado_por_id: number) =>
    request<PlanPOES>(
      `/planes-poes/${id}/clonar?elaborado_por_id=${elaborado_por_id}`,
      { method: "POST" },
    ),

  obtenerTareas: (planId: number) =>
    request<TareaPOES[]>(`/planes-poes/${planId}/tareas`),
  crearTarea: (planId: number, payload: TareaPOESCreatePayload) =>
    request<TareaPOES>(`/planes-poes/${planId}/tareas`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  modificarTarea: (
    tareaId: number,
    payload: Partial<TareaPOESCreatePayload> & { activo?: boolean },
  ) =>
    request<TareaPOES>(`/planes-poes/tareas/${tareaId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  eliminarTarea: (tareaId: number) =>
    request<TareaPOES>(`/planes-poes/tareas/${tareaId}`, {
      method: "DELETE",
    }),

  obtenerPersonal: () => request<Persona[]>("/personal/"),
  obtenerEquipos: () => request<Equipo[]>("/equipos/"),
  obtenerSectores: () => request<Sector[]>("/sectores/"),
  obtenerInsumosQuimicos: () =>
    request<InsumoQuimicoCatalogo[]>("/insumos-quimicos/"),
  obtenerElementosLimpieza: () =>
    request<ElementoLimpiezaCatalogo[]>("/elementos-limpieza/"),
};

export const obtenerBorradorOpcional = async (): Promise<PlanPOES | null> => {
  try {
    return await planesApi.obtenerBorrador();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};

export const obtenerActivoOpcional = async (): Promise<PlanPOES | null> => {
  try {
    return await planesApi.obtenerPlanActivo();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
