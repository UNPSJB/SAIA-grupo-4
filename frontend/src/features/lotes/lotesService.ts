import { apiFetch } from "../auth/apiFetch";
import type { Lote, LoteCreate } from "./types";

export interface AsociarInsumosPayload {
  insumos: Array<{
    insumo_id: number;
    cantidad: number;
  }>;
}

export const getLotes = async (): Promise<Lote[]> => {
  const res = await apiFetch("/lotes/");
  if (!res.ok) {
    throw new Error("Error al consultar lotes");
  }
  return await res.json();
};

export const createLote = async (data: LoteCreate): Promise<Lote> => {
  const res = await apiFetch("/lotes/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Error al registrar el lote");
  }
  return await res.json();
};

export const asociarInsumosALote = async (loteId: number, data: AsociarInsumosPayload): Promise<void> => {
  const res = await apiFetch(`/lotes/${loteId}/insumos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Error al asociar insumos al lote");
  }
};