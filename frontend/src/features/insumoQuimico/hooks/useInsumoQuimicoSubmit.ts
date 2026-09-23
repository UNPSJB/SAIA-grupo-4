import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; insumoQuimicoId: number }
  | { status: "error"; message: string };

export interface InsumoQuimicoPayload {
  nombre: string;
  unidad_medida_id: string;
  tipo: string;
}

type FastApiError = {
  detail?: string | { code?: string; insumo_quimico_id?: number };
};

interface UseInsumoQuimicoSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (insumo_quimico_id: number) => void;
  onSuccess?: () => void;
}

export const useInsumoQuimicoSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseInsumoQuimicoSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values?: InsumoQuimicoPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          nombre: values?.nombre.toLocaleLowerCase() ?? "",
          unidad_medida_id: values ? Number(values.unidad_medida_id) : undefined,
          tipo: values?.tipo ?? "",
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
            typeof detailInactivo.insumo_quimico_id === "number"
          ) {
            onInactivo?.(detailInactivo.insumo_quimico_id);
            return { status: "inactivo", insumoQuimicoId: detailInactivo.insumo_quimico_id };
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
                mensajeError = "El insumo químico ya existe.";
                break;
              case 404:
                mensajeError = "Insumo químico no existe.";
                break;
              case 409:
                mensajeError = "Ya existe un insumo químico activo con ese nombre.";
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