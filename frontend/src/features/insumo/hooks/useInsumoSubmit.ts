import { apiFetch } from "../../../features/auth/apiFetch";
import { JSON_HEADERS } from "../../../config";
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
  densidad_g_ml?: string;
  peso_unitario_g?: string;
  denominacion_rotulo?: string;
  clase_funcional?: string;
  numero_ins?: string;
  base_calculo?: "100g" | "100ml";
  alimento_referencia_id?: string;
  fuente_nutricional?: string;
  valor_energetico_kcal?: string;
  carbohidratos_g?: string;
  azucares_totales_g?: string;
  azucares_anadidos_g?: string;
  proteinas_g?: string;
  grasas_totales_g?: string;
  grasas_saturadas_g?: string;
  grasas_trans_g?: string;
  fibra_g?: string;
  sodio_mg?: string;
}

type FastApiError = {
  detail?: string | { code?: string; insumo_id?: number };
};

interface UseInsumoSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (insumo_id: number) => void;
  onSuccess?: () => void;
}

const parseOptionalNumber = (val?: string): number | null => {
  if (!val || val.trim() === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

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
          densidad_g_ml: parseOptionalNumber(values?.densidad_g_ml),
          peso_unitario_g: parseOptionalNumber(values?.peso_unitario_g),
          denominacion_rotulo:
            values?.denominacion_rotulo && values.denominacion_rotulo.trim() !== ""
              ? values.denominacion_rotulo.trim()
              : null,
          clase_funcional:
            values?.clase_funcional && values.clase_funcional.trim() !== ""
              ? values.clase_funcional.trim()
              : null,
          numero_ins:
            values?.numero_ins && values.numero_ins.trim() !== ""
              ? values.numero_ins.trim()
              : null,
          base_calculo: values?.base_calculo || "100g",
          alimento_referencia_id: parseOptionalNumber(values?.alimento_referencia_id),
          fuente_nutricional:
            values?.fuente_nutricional && values.fuente_nutricional.trim() !== ""
              ? values.fuente_nutricional.trim()
              : null,
          valor_energetico_kcal: parseOptionalNumber(values?.valor_energetico_kcal),
          carbohidratos_g: parseOptionalNumber(values?.carbohidratos_g),
          azucares_totales_g: parseOptionalNumber(values?.azucares_totales_g),
          azucares_anadidos_g: parseOptionalNumber(values?.azucares_anadidos_g),
          proteinas_g: parseOptionalNumber(values?.proteinas_g),
          grasas_totales_g: parseOptionalNumber(values?.grasas_totales_g),
          grasas_saturadas_g: parseOptionalNumber(values?.grasas_saturadas_g),
          grasas_trans_g: parseOptionalNumber(values?.grasas_trans_g),
          fibra_g: parseOptionalNumber(values?.fibra_g),
          sodio_mg: parseOptionalNumber(values?.sodio_mg),
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
            // ignorar
          }

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

          let mensajeError = "Ocurrió un error inesperado";
          if (bodyRes?.detail) {
            if (typeof bodyRes.detail === "string") {
              mensajeError = bodyRes.detail;
            } else if (typeof bodyRes.detail.code === "string") {
              mensajeError = bodyRes.detail.code;
            }
          } else {
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
