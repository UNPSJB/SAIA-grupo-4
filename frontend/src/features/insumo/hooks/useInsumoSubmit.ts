import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; insumoId: number }
  | { status: "error"; message: string };

export interface InsumoPayload {
  nombre: string;
  unidad_medida: string;
  categoria: string;
  descripcion: string;
}

interface UseInsumoSubmitOptions {
  endpoint: string; // URL base (ej: "http://127.0.0.1:8000/insumos/")
  method?: "POST" | "PUT"; // método HTTP
  id?: number | string; // solo para PUT
  body?: Record<string, unknown>; // override del body (ej: { disponible: true })
  onInactivo?: (insumo_id: number) => void; // cuando el insumo existe pero está inactivo (409)
  onSuccess?: () => void;
}

/**
 * Hook que devuelve una función de envío para los formularios de insumo.
 * La validación de campos la resuelve react-hook-form (zod); este hook
 * solo se encarga del fetch y del mapeo de errores HTTP.
 */
export const useInsumoSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseInsumoSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values?: InsumoPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre.toLocaleLowerCase() ?? "",
          unidad_medida: values?.unidad_medida ?? "",
          categoria: values?.categoria ?? "",
          descripcion: values?.descripcion ?? "",
        };

        const url = id ? `${endpoint}${id}/` : endpoint;
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 409) {
            try {
              const bodyRes = await res.json();
              const insumoId = bodyRes?.detail?.insumo_id;
              if (typeof insumoId === "number") {
                onInactivo?.(insumoId);
                return { status: "inactivo", insumoId };
              }
            } catch {
              // fallthrough: se trata como error genérico
            }
          }

          let mensajeError = "Ocurrió un error inesperado";
          switch (res.status) {
            case 400:
              mensajeError = "El insumo ya existe.";
              break;
            case 404:
              mensajeError = "Insumo no existe.";
              break;
            case 500:
              mensajeError = "Error interno del servidor.";
              break;
            default:
              mensajeError = `Error ${res.status || "desconocido"}`;
          }
          return { status: "error", message: mensajeError };
        }

        onSuccess?.();
        return { status: "success" };
      } catch {
        return { status: "error", message: "Ocurrió un error inesperado" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [endpoint, method, id, body, onInactivo, onSuccess],
  );

  return { submit, isSubmitting };
};