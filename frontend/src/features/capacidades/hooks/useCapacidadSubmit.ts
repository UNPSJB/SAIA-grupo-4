import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; capacidadId: number }
  | { status: "error"; message: string };

export interface CapacidadPayload {
  nombre: string;
  descripcion?: string;
}

interface UseCapacidadSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (capacidad_id: number) => void;
  onSuccess?: () => void;
}

export const useCapacidadSubmit = ({ endpoint, method = "POST", id, body, onInactivo, onSuccess }: UseCapacidadSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values?: CapacidadPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre ?? "",
          descripcion: values?.descripcion ?? "",
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

          if (res.status === 409 && bodyRes?.detail?.capacidad_id) {
            onInactivo?.(bodyRes.detail.capacidad_id);
            return { status: "inactivo", capacidadId: bodyRes.detail.capacidad_id };
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