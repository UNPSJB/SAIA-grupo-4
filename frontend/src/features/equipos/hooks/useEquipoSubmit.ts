import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; equipoId: number }
  | { status: "error"; message: string };

export interface EquipoPayload {
  nombre: string;
  marca: string;
  numero_serie: string;
  categoria: string;
  sector_id: number;
  ubicacion?: string;
}

interface UseEquipoSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (equipo_id: number) => void;
  onSuccess?: () => void;
}

export const useEquipoSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseEquipoSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values?: EquipoPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre ?? "",
          marca: values?.marca ?? "",
          numero_serie: values?.numero_serie ?? "",
          categoria: values?.categoria ?? "",
          sector_id: values?.sector_id,
          ubicacion: values?.ubicacion ?? "",
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

          // 1. Caso especial: Equipo que requiere reactivación (captura el 409 y el equipo_id)
          if (res.status === 409 && bodyRes?.detail?.equipo_id) {
            onInactivo?.(bodyRes.detail.equipo_id);
            return { status: "inactivo", equipoId: bodyRes.detail.equipo_id };
          }

          let mensajeError = "Ocurrió un error inesperado";
          
          // 2. Extraer el mensaje exacto que manda FastAPI
          if (bodyRes?.detail) {
            if (typeof bodyRes.detail === "string") {
              // Excepciones estándar donde detail es un texto (ej: SectorInactivo)
              mensajeError = bodyRes.detail;
            } else if (typeof bodyRes.detail.code === "string") {
              // Excepciones personalizadas donde detail es un objeto con "code"
              mensajeError = bodyRes.detail.code;
            }
          } else {
            // 3. Fallback genérico por si el servidor se cae y no manda JSON
            switch (res.status) {
              case 400:
                mensajeError = "Datos inválidos enviados al servidor.";
                break;
              case 404:
                mensajeError = "El recurso no fue encontrado.";
                break;
              case 409:
                mensajeError = "Conflicto con los datos ingresados.";
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