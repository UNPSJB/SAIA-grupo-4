import { useCallback, useState } from "react";
import { JSON_HEADERS } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type { AlimentoReferenciaFormValues } from "../validationSchema";

export type SubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

interface UseAlimentoReferenciaSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number;
  onSuccess?: () => void;
}

const aNumero = (val?: string): number => {
  if (!val || val.trim() === "") return 0;
  return Number(val);
};

export const useAlimentoReferenciaSubmit = ({
  endpoint,
  method = "POST",
  id,
  onSuccess,
}: UseAlimentoReferenciaSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (values: AlimentoReferenciaFormValues): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = {
          codigo: values.codigo?.trim() || null,
          alimento: values.alimento.trim(),
          categoria: values.categoria?.trim() || null,
          energia_kcal: aNumero(values.energia_kcal),
          proteinas_g: aNumero(values.proteinas_g),
          grasas_totales_g: aNumero(values.grasas_totales_g),
          carbohidratos_g: aNumero(values.carbohidratos_g),
          fibra_g: aNumero(values.fibra_g),
          sodio_mg: aNumero(values.sodio_mg),
          grasas_saturadas_g: aNumero(values.grasas_saturadas_g),
        };

        const url = id ? `${endpoint}${id}` : endpoint;
        const res = await apiFetch(url, {
          method,
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let detail: string | undefined;
          try {
            const json = await res.json();
            if (typeof json?.detail === "string") detail = json.detail;
          } catch {
            // ignorar
          }
          return {
            status: "error",
            message: detail || `Error ${res.status} al guardar el alimento.`,
          };
        }

        onSuccess?.();
        return { status: "success" };
      } catch {
        return {
          status: "error",
          message: "Ocurrió un error de red o inesperado.",
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [endpoint, method, id, onSuccess],
  );

  return { submit, isSubmitting };
};
