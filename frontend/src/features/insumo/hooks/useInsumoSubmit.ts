import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; insumoId: number }
  | { status: "error"; message: string };

export interface InsumoPayload {
  nombre: string;
  unidad_medida_id: string;
  categoria: string;
  descripcion: string;
}

type FastApiError = {
  detail?: string | { code?: string; insumo_id?: number };
};

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
          unidad_medida_id: values ? Number(values.unidad_medida_id) : undefined,
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
          let bodyRes: FastApiError | null = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Si la respuesta no es JSON, bodyRes queda en null
          }

          // 1. Caso especial: Insumo inactivo (captura el 409 y el insumo_id)
          const detailInactivo = bodyRes?.detail;
          if (
            res.status === 409 &&
            typeof detailInactivo === "object" &&
            detailInactivo !== null &&
            typeof detailInactivo.insumo_id === "number"
          ) {
            onInactivo?.(detailInactivo.insumo_id);
            return { status: "inactivo", insumoId: detailInactivo.insumo_id };
          }

          // 2. Extraer el mensaje exacto que manda FastAPI
          let mensajeError = "Ocurrió un error inesperado";
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
                mensajeError = "El insumo ya existe.";
                break;
              case 404:
                mensajeError = "Insumo no existe.";
                break;
              case 409:
                mensajeError = "Ya existe un insumo activo con ese nombre.";
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