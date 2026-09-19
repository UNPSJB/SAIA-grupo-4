import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; sectorId: number }
  | { status: "error"; message: string };

export interface SectorPayload {
  nombre: string;
}

interface UseSectorSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (sector_id: number) => void;
  onSuccess?: () => void;
}

export const useSectorSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseSectorSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values?: SectorPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre ?? "",
        };

        const url = id ? `${endpoint}${id}/` : endpoint;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let bodyRes: any = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Si la respuesta no es JSON, bodyRes queda en null
          }

          // 1. Caso especial: Sector inactivo (captura el 409 y el sector_id)
          if (res.status === 409 && typeof bodyRes?.detail?.sector_id === "number") {
            onInactivo?.(bodyRes.detail.sector_id);
            return { status: "inactivo", sectorId: bodyRes.detail.sector_id };
          }

          let mensajeError = "Ocurrió un error inesperado";

          // 2. Extraer el mensaje exacto que manda FastAPI
          if (bodyRes?.detail) {
            if (typeof bodyRes.detail === "string") {
              mensajeError = bodyRes.detail;
            } else if (typeof bodyRes.detail.code === "string") {
              mensajeError = bodyRes.detail.code;
            }
          } else {
            // 3. Fallback genérico por status HTTP
            switch (res.status) {
              case 400:
                mensajeError = "Datos inválidos enviados al servidor.";
                break;
              case 404:
                mensajeError = "El sector no existe.";
                break;
              case 409:
                mensajeError = "Ya existe un sector activo con ese nombre.";
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

        onSuccess?.();
        return { status: "success" };
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