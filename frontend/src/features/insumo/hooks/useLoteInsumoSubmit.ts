import { apiFetch } from "../../../features/auth/apiFetch";
import { JSON_HEADERS } from "../../../config";
import { useCallback, useState } from "react";
import type { LoteInsumo } from "../types";

export type SubmitLoteResult =
  | { status: "success"; data: LoteInsumo }
  | { status: "error"; message: string };

export interface LoteInsumoPayload {
  codigo_lote: string;
  fecha_vencimiento: string; // "YYYY-MM-DD", tal cual lo da <input type="date">
}

type FastApiError = {
  detail?: string | unknown[];
};

interface UseLoteInsumoSubmitOptions {
  endpoint: string; // URL base (ej: `${BASE_URL}/lotes-insumo/`)
  insumoId: number | undefined; // insumo al que se le registra el lote
  onSuccess?: (lote: LoteInsumo) => void;
}

/**
 * Hook que devuelve una función de envío para el formulario de lote de insumo.
 * La validación de campos la resuelve react-hook-form (zod); este hook
 * solo se encarga del fetch y del mapeo de errores HTTP.
 */
export const useLoteInsumoSubmit = ({
  endpoint,
  insumoId,
  onSuccess,
}: UseLoteInsumoSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values: LoteInsumoPayload): Promise<SubmitLoteResult> => {
      if (insumoId === undefined) {
        return { status: "error", message: "No se seleccionó ningún insumo." };
      }

      setIsSubmitting(true);
      try {
        const res = await apiFetch(endpoint, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            insumo_id: insumoId,
            codigo_lote: values.codigo_lote.trim(),
            fecha_vencimiento: values.fecha_vencimiento,
          }),
        });

        if (!res.ok) {
          let bodyRes: FastApiError | null = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Si la respuesta no es JSON, bodyRes queda en null
          }

          // 1. Mensaje exacto que manda FastAPI (los 400/404 de nuestro backend)
          let mensajeError = "Ocurrió un error inesperado";
          if (typeof bodyRes?.detail === "string") {
            mensajeError = bodyRes.detail;
          } else {
            // 2. Fallback genérico por status HTTP (incluye 422 con detail en lista)
            switch (res.status) {
              case 400:
                mensajeError = "No se pudo registrar el lote.";
                break;
              case 404:
                mensajeError = "El insumo no existe.";
                break;
              case 422:
                mensajeError = "Revisá el código de lote y la fecha de vencimiento.";
                break;
              case 500:
                mensajeError = "Error interno del servidor.";
                break;
              default:
                mensajeError = `Error ${res.status || "desconocido"}`;
            }
          }

          return { status: "error", message: mensajeError };
        }

        const data: LoteInsumo = await res.json();
        onSuccess?.(data);
        return { status: "success", data };
      } catch {
        return { status: "error", message: "Ocurrió un error de red o inesperado" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [endpoint, insumoId, onSuccess],
  );

  return { submit, isSubmitting };
};