import { BASE_URL, JSON_HEADERS } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type {
  RotuloProductoConsolidado,
  RotuloProductoUpdate,
  VistaPreviaRotulo,
} from "../types";

async function extraerError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // ignorar error de parseo
  }
  return fallback;
}

export const rotuloProductoApi = {
  async obtenerRotulo(productoId: number): Promise<RotuloProductoConsolidado> {
    const res = await apiFetch(`${BASE_URL}/productos/${productoId}/rotulo`);
    if (!res.ok) {
      throw new Error(
        await extraerError(res, "No se pudo cargar la información del rótulo."),
      );
    }
    return res.json();
  },

  async guardarRotulo(
    productoId: number,
    payload: RotuloProductoUpdate,
  ): Promise<RotuloProductoConsolidado> {
    const res = await apiFetch(`${BASE_URL}/productos/${productoId}/rotulo`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(
        await extraerError(res, "No se pudieron guardar los datos del rótulo."),
      );
    }
    return res.json();
  },

  async obtenerVistaPrevia(productoId: number): Promise<VistaPreviaRotulo> {
    const res = await apiFetch(
      `${BASE_URL}/productos/${productoId}/rotulo/vista-previa`,
    );
    if (!res.ok) {
      throw new Error(
        await extraerError(
          res,
          "No se pudo generar la vista previa del borrador del rótulo.",
        ),
      );
    }
    return res.json();
  },
};
