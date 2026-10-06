import { BASE_URL, JSON_HEADERS } from "../../../config";
import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

export interface RecambioPayload {
  elemento_id: number;
  fecha_recambio?: string | null;
  observaciones?: string | null;
}

interface UseRecambioSubmitOptions {
  onSuccess?: () => void;
}

// Un recambio solo se registra (POST); no se modifica ni se elimina

const ENDPOINT = `${BASE_URL}/recambios/`;

export const useRecambioSubmit = ({ onSuccess }: UseRecambioSubmitOptions = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values: RecambioPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            elemento_id: values.elemento_id,
            fecha_recambio: values.fecha_recambio || null,
            observaciones: values.observaciones?.trim() || null,
          }),
        });

        if (!res.ok) {
          let bodyRes: { detail?: unknown } | null = null;
          try { bodyRes = await res.json(); } catch { /* respuesta sin JSON */ }

          let mensajeError = "Ocurrió un error inesperado";
          const detail = bodyRes?.detail;
          if (typeof detail === "string") mensajeError = detail;
          else if (Array.isArray(detail) && detail[0]?.msg) mensajeError = detail[0].msg;
          else {
            switch (res.status) {
              case 400: mensajeError = "Datos inválidos enviados al servidor."; break;
              case 404: mensajeError = "El elemento de limpieza no fue encontrado."; break;
              case 409: mensajeError = "Conflicto con los datos ingresados."; break;
              case 500: mensajeError = "Error interno del servidor."; break;
              default: mensajeError = `Error ${res.status || "desconocido"}`;
            }
          }
          return { status: "error", message: mensajeError };
        }

        onSuccess?.();
        return { status: "success" };
      } catch {
        return { status: "error", message: "Ocurrió un error de red o inesperado" };
      } finally {
        setIsSubmitting(false);
      }
    }, [onSuccess]
  );

  return { submit, isSubmitting };
};
