import { apiFetch } from "../../../features/auth/apiFetch";
import { JSON_HEADERS } from "../../../config";
import { useCallback, useState } from "react";
import type { LoteInsumo } from "../types";

export type InhabilitarResult =
  | { status: "success"; lote: LoteInsumo }
  | { status: "error"; message: string };

type FastApiError = {
  detail?: string | { code?: string } | unknown[];
};

interface UseLoteInsumoInhabilitarOptions {
  endpoint: string; // URL base (ej: `${BASE_URL}/lotes-insumo/`)
  loteId: number;
  onSuccess?: (lote: LoteInsumo) => void;
}

/**
 * Hook que devuelve la función de envío del modal de inhabilitar lote.
 * La validación del motivo la resuelve react-hook-form (zod); este hook
 * solo se encarga del PATCH y del mapeo de errores HTTP.
 */
export const useLoteInsumoInhabilitar = ({
  endpoint,
  loteId,
  onSuccess,
}: UseLoteInsumoInhabilitarOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values: { motivo: string }): Promise<InhabilitarResult> => {
      setIsSubmitting(true);
      try {
        const res = await apiFetch(`${endpoint}${loteId}/inhabilitar`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ motivo: values.motivo.trim() }),
        });

        if (!res.ok) {
          let bodyRes: FastApiError | null = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Si la respuesta no es JSON, bodyRes queda en null
          }

          // 1. Mensaje exacto que manda FastAPI, si viene como texto o con "code"
          const detail = bodyRes?.detail;
          if (typeof detail === "string") {
            return { status: "error", message: detail };
          }
          if (
            detail &&
            !Array.isArray(detail) &&
            typeof detail.code === "string"
          ) {
            return { status: "error", message: detail.code };
          }

          // 2. Fallback genérico por status HTTP
          let mensajeError: string;
          switch (res.status) {
            case 400:
              mensajeError = "El lote ya está inhabilitado.";
              break;
            case 403:
              mensajeError = "No tiene permisos para inhabilitar lotes.";
              break;
            case 404:
              mensajeError = "El lote no existe.";
              break;
            case 422:
              mensajeError = "El motivo ingresado no es válido.";
              break;
            case 500:
              mensajeError = "Error interno del servidor.";
              break;
            default:
              mensajeError = `Error ${res.status || "desconocido"}`;
          }
          return { status: "error", message: mensajeError };
        }

        const lote: LoteInsumo = await res.json();
        onSuccess?.(lote);
        return { status: "success", lote };
      } catch {
        return {
          status: "error",
          message: "Ocurrió un error de red o inesperado",
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [endpoint, loteId, onSuccess],
  );

  return { submit, isSubmitting };
};