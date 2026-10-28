import { apiFetch } from "../auth/apiFetch";
import type { Lote, LoteCreate } from "./types";

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