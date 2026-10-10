import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; documentoId: number }
  | { status: "error"; message: string };

export interface DocumentoPersonalPayload {
  nombre: string;
  vigencia_dias: number;
}

interface UseDocumentoPersonalSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (documento_id: number) => void;
  onSuccess?: () => void;
}

export const useDocumentoPersonalSubmit = ({ endpoint, method = "POST", id, body, onInactivo, onSuccess }: UseDocumentoPersonalSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values?: DocumentoPersonalPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre ?? "",
          vigencia_dias: values?.vigencia_dias,
        };

        const url = id ? `${endpoint}${id}` : endpoint;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let bodyRes: { detail?: string | { code?: string; documento_id?: number } } | null = null;
          try { bodyRes = await res.json(); } catch { /* la respuesta no trae un cuerpo JSON */ }

          if (res.status === 409 && typeof bodyRes?.detail === "object" && bodyRes.detail.documento_id) {
            onInactivo?.(bodyRes.detail.documento_id);
            return { status: "inactivo", documentoId: bodyRes.detail.documento_id };
          }

          let mensajeError = "Ocurrió un error inesperado";

          if (bodyRes?.detail) {
            if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
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
    }, [endpoint, method, id, body, onInactivo, onSuccess]
  );

  return { submit, isSubmitting };
};
