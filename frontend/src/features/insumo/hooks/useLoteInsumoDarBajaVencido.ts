import { apiFetch } from "../../../features/auth/apiFetch";
import { useCallback, useState } from "react";
import type { LoteInsumo } from "../types";

export type DarBajaVencidoResult =
  | { status: "success"; lote: LoteInsumo }
  | { status: "error"; message: string };

type FastApiError = {
  detail?: string | { code?: string } | unknown[];
};

interface Options {
  endpoint: string; // ej: `${BASE_URL}/lotes-insumo/`
  loteId: number;
}

/** PATCH /lotes-insumo/{id}/dar-baja-vencido. El motivo lo fija el backend. */
export const useLoteInsumoDarBajaVencido = ({ endpoint, loteId }: Options) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (): Promise<DarBajaVencidoResult> => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${endpoint}${loteId}/dar-baja-vencido`, {
        method: "PATCH",
      });

      if (!res.ok) {
        let bodyRes: FastApiError | null = null;
        try {
          bodyRes = await res.json();
        } catch {
          // Si la respuesta no es JSON, bodyRes queda en null
        }

        const detail = bodyRes?.detail;
        if (typeof detail === "string") {
          return { status: "error", message: detail };
        }
        if (detail && !Array.isArray(detail) && typeof detail.code === "string") {
          return { status: "error", message: detail.code };
        }

        let message: string;
        switch (res.status) {
          case 400:
            message = "El lote ya fue dado de baja o todavía no está vencido.";
            break;
          case 403:
            message = "No tiene permisos para dar de baja lotes.";
            break;
          case 404:
            message = "El lote no existe.";
            break;
          case 500:
            message = "Error interno del servidor.";
            break;
          default:
            message = `Error ${res.status || "desconocido"}`;
        }
        return { status: "error", message };
      }

      const lote: LoteInsumo = await res.json();
      return { status: "success", lote };
    } catch {
      return {
        status: "error",
        message: "Ocurrió un error de red o inesperado",
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [endpoint, loteId]);

  return { submit, isSubmitting };
};