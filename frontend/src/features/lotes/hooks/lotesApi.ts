import { BASE_URL } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type { Lote, LoteCreatePayload, ProductoDisponibleLote } from "../types";

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let mensaje = fallbackError;
    try {
      const errorData = await res.json();
      if (typeof errorData.detail === "string") {
        mensaje = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        mensaje = errorData.detail.map((e: any) => e.msg || e.detail).join(", ");
      }
    } catch {
      // Ignorar fallback
    }
    throw new Error(mensaje);
  }
  return (await res.json()) as T;
}

export const lotesApi = {
  getProductosDisponibles: async (): Promise<ProductoDisponibleLote[]> => {
    const res = await apiFetch(`${BASE_URL}/lotes/productos-disponibles`);
    return handleResponse<ProductoDisponibleLote[]>(res, "No se pudieron obtener los productos con receta activa.");
  },

  sugerirCodigoLote: async (productoId: number, fecha?: string): Promise<{ codigo_lote: string }> => {
    const query = new URLSearchParams({ producto_id: String(productoId) });
    if (fecha) query.set("fecha", fecha);
    const res = await apiFetch(`${BASE_URL}/lotes/sugerir-codigo?${query.toString()}`);
    return handleResponse<{ codigo_lote: string }>(res, "No se pudo autogenerar el código de lote.");
  },

  createLote: async (payload: LoteCreatePayload): Promise<Lote> => {
    const res = await apiFetch(`${BASE_URL}/lotes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<Lote>(res, "No se pudo registrar el lote de producción.");
  },

  getMisLotes: async (params?: {
    busqueda?: string;
    producto_id?: number;
    desde?: string;
    hasta?: string;
  }): Promise<Lote[]> => {
    const query = new URLSearchParams();
    if (params?.busqueda) query.set("busqueda", params.busqueda);
    if (params?.producto_id) query.set("producto_id", String(params.producto_id));
    if (params?.desde) query.set("desde", params.desde);
    if (params?.hasta) query.set("hasta", params.hasta);

    const qs = query.toString();
    const endpoint = qs ? `${BASE_URL}/lotes/mis-lotes?${qs}` : `${BASE_URL}/lotes/mis-lotes`;
    const res = await apiFetch(endpoint);
    return handleResponse<Lote[]>(res, "No se pudieron cargar sus lotes de producción.");
  },

  getHistorialGeneral: async (params?: {
    busqueda?: string;
    producto_id?: number;
    receta_id?: number;
    operador_id?: number;
    desde?: string;
    hasta?: string;
  }): Promise<Lote[]> => {
    const query = new URLSearchParams();
    if (params?.busqueda) query.set("busqueda", params.busqueda);
    if (params?.producto_id) query.set("producto_id", String(params.producto_id));
    if (params?.receta_id) query.set("receta_id", String(params.receta_id));
    if (params?.operador_id) query.set("operador_id", String(params.operador_id));
    if (params?.desde) query.set("desde", params.desde);
    if (params?.hasta) query.set("hasta", params.hasta);

    const qs = query.toString();
    const endpoint = qs ? `${BASE_URL}/lotes/?${qs}` : `${BASE_URL}/lotes/`;
    const res = await apiFetch(endpoint);
    return handleResponse<Lote[]>(res, "No se pudo cargar el historial general de lotes.");
  },

  getLotePorId: async (id: number): Promise<Lote> => {
    const res = await apiFetch(`${BASE_URL}/lotes/${id}`);
    return handleResponse<Lote>(res, "No se pudo cargar el detalle del lote.");
  },
};
