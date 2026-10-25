import { apiFetch } from "../../../features/auth/apiFetch";
import { JSON_HEADERS } from "../../../config";
import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; productoId: number }
  | { status: "error"; message: string };

export interface ProductoPayload {
  nombre: string;
  descripcion: string;
  unidad_medida_id: string;
}

type FastApiError = {
  detail?: string | { code?: string; producto_id?: number };
};

interface UseProductoSubmitOptions {
  endpoint: string; 
  method?: "POST" | "PUT"; 
  id?: number | string; 
  body?: Record<string, unknown>; 
  onInactivo?: (producto_id: number) => void; 
  onSuccess?: () => void;
}

export const useProductoSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseProductoSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values?: ProductoPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre.toLocaleLowerCase() ?? "",
          descripcion: values?.descripcion ?? "",
          unidad_medida_id: values ? Number(values.unidad_medida_id) : undefined,
        };

        const url = id ? `${endpoint}${id}` : endpoint;
        const res = await apiFetch(url, {
          method,
          headers: JSON_HEADERS,
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
            typeof detailInactivo.producto_id === "number"
          ) {
            onInactivo?.(detailInactivo.producto_id);
            return { status: "inactivo", productoId: detailInactivo.producto_id };
          }

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
                mensajeError = "El producto ya existe.";
                break;
              case 404:
                mensajeError = "Producto no existe.";
                break;
              case 409:
                mensajeError = "Ya existe un producto activo con ese nombre.";
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