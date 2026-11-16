import { BASE_URL, JSON_HEADERS } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type {
  NormativaRotulado,
  NormativaRotuladoUpdate,
  ParametroNutricional,
  ParametroNutricionalUpdateItem,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${BASE_URL}${path}`, {
    headers: init?.body ? JSON_HEADERS : undefined,
    ...init,
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") msg = body.detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

export const configuracionNutricionalApi = {
  listarParametros: () =>
    request<ParametroNutricional[]>("/configuracion-nutricional/"),
  actualizarParametros: (parametros: ParametroNutricionalUpdateItem[]) =>
    request<ParametroNutricional[]>("/configuracion-nutricional/", {
      method: "PUT",
      body: JSON.stringify({ parametros }),
    }),
  restaurarDefecto: () =>
    request<ParametroNutricional[]>("/configuracion-nutricional/restaurar-defecto", {
      method: "POST",
    }),
  obtenerNormativaRotulado: () =>
    request<NormativaRotulado>("/configuracion-nutricional/rotulado-frontal"),
  actualizarNormativaRotulado: (payload: NormativaRotuladoUpdate) =>
    request<NormativaRotulado>("/configuracion-nutricional/rotulado-frontal", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  restaurarNormativaRotuladoDefecto: () =>
    request<NormativaRotulado>(
      "/configuracion-nutricional/rotulado-frontal/restaurar-defecto",
      {
        method: "POST",
      },
    ),
};
