import { useCallback, useState } from "react";

export type SubmitResult<T = unknown> =
  | { status: "success"; data: T }
  | { status: "inactivo"; incidenteId: number }
  | { status: "error"; message: string };

export interface IncidentePayload {
  titulo: string;
  descripcion: string;
  fecha_hora_reporte: string;
  reportante_id: number;
  tipo_id: number;
}

type FastApiError = {
  detail?: string | { code?: string; incidente_id?: number };
};

interface UseIncidentesSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (incidente_id: number) => void;
  onSuccess?: (data?: any) => void;
}

export const useIncidentesSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseIncidentesSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values?: IncidentePayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          titulo: values?.titulo ?? "",
          descripcion: values?.descripcion ?? "",
          fecha_hora_reporte: values?.fecha_hora_reporte ?? "",
          reportante_id: Number(values?.reportante_id) ?? "",
          tipo_id: Number(values?.tipo_id) ?? "",
        };

        const url = id ? `${endpoint}${id}/` : endpoint;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let bodyRes: FastApiError | null = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Si la respuesta no es JSON, bodyRes queda en null
          }

          const detailInactivo = bodyRes?.detail;
          if (
            res.status === 409 &&
            typeof detailInactivo === "object" &&
            detailInactivo !== null &&
            typeof detailInactivo.incidente_id === "number"
          ) {
            onInactivo?.(detailInactivo.incidente_id);
            return { status: "inactivo", incidenteId: detailInactivo.incidente_id };
          }

          let mensajeError = "Ocurrió un error inesperado";
          if (bodyRes?.detail) {
            if (typeof bodyRes.detail === "string") {
              mensajeError = bodyRes.detail;
            } else if (typeof bodyRes.detail.code === "string") {
              mensajeError = bodyRes.detail.code;
            }
          } else {
            switch (res.status) {
              case 500:
                mensajeError = "Error interno del servidor.";
                break;
              default:
                mensajeError = `Error ${res.status || "desconocido"}`;
            }
          }

          return { status: "error", message: mensajeError };
        }

        const data = await res.json();
        onSuccess?.(data);
        return { status: "success", data };
      } catch {
        return { status: "error", message: "Ocurrió un error de red o inesperado" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [endpoint, method, id, body, onInactivo, onSuccess],
  );

  return { submit, isSubmitting };
};