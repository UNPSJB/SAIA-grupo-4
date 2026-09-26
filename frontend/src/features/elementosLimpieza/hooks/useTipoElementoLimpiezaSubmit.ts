import { useCallback, useState } from "react";
import type { TipoElementoLimpieza } from "../types";

export type SubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

export interface TipoElementoLimpiezaPayload {
  nombre?: string;
  prefijo?: string;
}

interface UseTipoElementoLimpiezaSubmitOptions {
  endpoint: string;
  method?: "POST" | "PUT";
  id?: number | string;
  body?: Record<string, unknown>;
  onSuccess?: (tipo: TipoElementoLimpieza) => void;
}

export const useTipoElementoLimpiezaSubmit = ({ endpoint, method = "POST", id, body, onSuccess }: UseTipoElementoLimpiezaSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values?: TipoElementoLimpiezaPayload): Promise<SubmitResult> => {
    setIsSubmitting(true);
    try {
      const payload = body ?? values;
      const url = id ? `${endpoint}${id}/` : endpoint;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let bodyRes: any = null;
        try { bodyRes = await res.json(); } catch {}

        let mensajeError = "Ocurrió un error inesperado";
        if (bodyRes?.detail) {
          if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
          else if (Array.isArray(bodyRes.detail) && bodyRes.detail[0]?.msg) {
            mensajeError = bodyRes.detail[0].msg.replace(/^Value error,\s*/, "");
          }
          else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
        } else {
          switch (res.status) {
            case 400: mensajeError = "Datos inválidos enviados al servidor."; break;
            case 404: mensajeError = "El tipo no fue encontrado."; break;
            case 409: mensajeError = "Conflicto con los datos ingresados."; break;
            case 500: mensajeError = "Error interno del servidor."; break;
            default: mensajeError = `Error ${res.status || "desconocido"}`;
          }
        }
        return { status: "error", message: mensajeError };
      }

      const data = await res.json().catch(() => null);
      if (data) onSuccess?.(data);
      return { status: "success" };
    } catch {
      return { status: "error", message: "Ocurrió un error de red o inesperado" };
    } finally {
      setIsSubmitting(false);
    }
  }, [endpoint, method, id, body, onSuccess]);

  return { submit, isSubmitting };
};