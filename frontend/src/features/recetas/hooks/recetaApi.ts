import { BASE_URL, JSON_HEADERS } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type { Equipo } from "../../equipos/types";
import type { Insumo } from "../../insumo/types";
import type { Producto } from "../../productos/types";
import type {
  FiltrosReceta,
  PasoReceta,
  PasoRecetaCreatePayload,
  PasoRecetaUpdatePayload,
  Receta,
  RecetaCreatePayload,
  RecetaUpdatePayload,
} from "../types";

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
      if (typeof body.detail === "object" && typeof body.detail.code === "string") {
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
    // ignore
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
    res = await apiFetch(`${BASE_URL}${path}`, {
      headers: init?.body ? JSON_HEADERS : undefined,
      ...init,
    });
  } catch {
    throw new Error("Ocurrió un error de red al intentar comunicarse con el servidor.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, await extraerMensaje(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const recetasApi = {
  listarRecetas: (filtros?: FiltrosReceta) => {
    const params = new URLSearchParams();
    if (filtros?.busqueda?.trim()) params.append("busqueda", filtros.busqueda.trim());
    if (filtros?.estado) params.append("estado", String(filtros.estado));
    if (filtros?.insumo_id) params.append("insumo_id", String(filtros.insumo_id));
    if (filtros?.equipo_id) params.append("equipo_id", String(filtros.equipo_id));
    if (filtros?.producto_id) params.append("producto_id", String(filtros.producto_id));
    const qs = params.toString();
    return request<Receta[]>(`/recetas/${qs ? `?${qs}` : ""}`);
  },
  obtenerRecetasActivas: () => request<Receta[]>("/recetas/activas"),
  obtenerBorrador: () => request<Receta>("/recetas/borrador"),
  obtenerReceta: (id: number) => request<Receta>(`/recetas/${id}`),
  crearReceta: (payload: RecetaCreatePayload) =>
    request<Receta>("/recetas/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  modificarReceta: (id: number, payload: RecetaUpdatePayload) =>
    request<Receta>(`/recetas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  activarReceta: (id: number) =>
    request<Receta>(`/recetas/${id}/activar`, { method: "POST" }),
  inhabilitarReceta: (id: number) =>
    request<Receta>(`/recetas/${id}/inhabilitar`, { method: "POST" }),
  pasarABorrador: (id: number) =>
    request<Receta>(`/recetas/${id}/pasar-a-borrador`, { method: "POST" }),
  retomarBorrador: (id: number) =>
    request<Receta>(`/recetas/${id}/retomar`, { method: "POST" }),
  clonarReceta: (id: number) =>
    request<Receta>(`/recetas/${id}/clonar`, { method: "POST" }),
  descartarReceta: (id: number) =>
    request<void>(`/recetas/${id}/descartar`, { method: "DELETE" }),

  listarPasos: (recetaId: number) =>
    request<PasoReceta[]>(`/recetas/${recetaId}/pasos`),
  obtenerPaso: (pasoId: number) =>
    request<PasoReceta>(`/recetas/pasos/${pasoId}`),
  agregarPaso: (recetaId: number, payload: PasoRecetaCreatePayload) =>
    request<PasoReceta>(`/recetas/${recetaId}/pasos`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  modificarPaso: (pasoId: number, payload: PasoRecetaUpdatePayload) =>
    request<PasoReceta>(`/recetas/pasos/${pasoId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  eliminarPaso: (pasoId: number) =>
    request<void>(`/recetas/pasos/${pasoId}`, { method: "DELETE" }),

  obtenerInsumos: () => request<Insumo[]>("/insumos/"),
  obtenerEquipos: () => request<Equipo[]>("/equipos/"),
  obtenerProductosActivos: () => request<Producto[]>("/productos/?estado=true"),
};

export const obtenerBorradorRecetaOpcional = async (): Promise<Receta | null> => {
  try {
    return await recetasApi.obtenerBorrador();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
