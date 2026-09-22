import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; personaId: number }
  | { status: "error"; message: string };

export interface PersonalPayload {
  nombre: string;
  apellido: string;
  dni: string;
  legajo: number;
  email?: string;
  telefono?: string;
  capacidades_ids?: number[];
}

interface UsePersonalSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (persona_id: number) => void;
  onSuccess?: () => void;
}

export const usePersonalSubmit = ({ endpoint, method = "POST", id, body, onInactivo, onSuccess }: UsePersonalSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values?: PersonalPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre ?? "",
          apellido: values?.apellido ?? "",
          dni: values?.dni ?? "",
          legajo: values?.legajo,
          email: values?.email || null,
          telefono: values?.telefono || null,
          capacidades_ids: values?.capacidades_ids ?? [],
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

          if (res.status === 409 && bodyRes?.detail?.persona_id) {
            onInactivo?.(bodyRes.detail.persona_id);
            return { status: "inactivo", personaId: bodyRes.detail.persona_id };
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