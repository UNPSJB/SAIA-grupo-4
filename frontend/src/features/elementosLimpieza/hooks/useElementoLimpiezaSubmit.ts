import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

export interface ElementoLimpiezaPayload {
  tipo_id: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  frecuencia_recambio_dias?: number | null;
}

interface UseElementoLimpiezaSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onSuccess?: () => void;
}

export const useElementoLimpiezaSubmit = ({ endpoint, method = "POST", id, body, onSuccess }: UseElementoLimpiezaSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values?: ElementoLimpiezaPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          tipo_id: values?.tipo_id,
          sector_id: values?.sector_id || null,
          equipo_id: values?.equipo_id || null,
          frecuencia_recambio_dias: values?.frecuencia_recambio_dias || null,
        };

        const url = id ? `${endpoint}${id}/` : endpoint;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let bodyRes: any = null;
          try { bodyRes = await res.json(); } catch {}

          let mensajeError = "Ocurrió un error inesperado";
          if (bodyRes?.detail) {
            if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
            else if (Array.isArray(bodyRes.detail) && bodyRes.detail[0]?.msg) {
              mensajeError = bodyRes.detail[0].msg.replace(/^Value error,\s*/, "");
            }
            else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
          } else {
            switch (res.status) {
              case 400: mensajeError = "Datos inválidos enviados al servidor."; break;
              case 404: mensajeError = "El recurso no fue encontrado."; break;
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
    }, [endpoint, method, id, body, onSuccess]
  );

  return { submit, isSubmitting };
};