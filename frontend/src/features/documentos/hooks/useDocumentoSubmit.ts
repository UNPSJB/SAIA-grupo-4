import { useCallback, useState } from "react";
import type { DocumentoFormData } from "../types";

// Los tres estados posibles que maneja el frontend al guardar
export type SubmitResult =
  | { status: "success" }
  | { status: "inactivo"; documentoId: number }
  | { status: "error"; message: string };

interface UseDocumentoSubmitOptions {
  endpoint: string;
  method?: "POST" | "PATCH"; 
  id?: number | string;
  body?: Record<string, unknown>;
  onInactivo?: (documento_id: number) => void;
  onSuccess?: () => void;
}

// Formatea un item suelto de `detail`
const formatearItemError = (item: unknown): string | null => {
  const { loc, msg } = (item ?? {}) as { loc?: unknown; msg?: unknown };
  if (typeof msg !== "string") return null;
  const campo = Array.isArray(loc) ? loc.at(-1) : undefined;
  if (typeof campo === "string" || typeof campo === "number") return `${campo}: ${msg}`;
  return msg;
};

// FastAPI puede devolver `detail` como string, como lista de errores de validación
// (422) o como objeto {code, errores} (nuestras excepciones de negocio)
export const extraerMensajeError = (detalle: unknown): string | null => {
  if (typeof detalle === "string") return detalle;

  if (Array.isArray(detalle)) {
    const partes = detalle.map(formatearItemError).filter((p): p is string => p !== null);
    if (partes.length > 0) return partes.join(" | ");
  }

  if (detalle && typeof detalle === "object") {
    const obj = detalle as { code?: unknown; errores?: unknown };
    const code = typeof obj.code === "string" ? obj.code : null;
    const errores = Array.isArray(obj.errores)
      ? obj.errores.map(formatearItemError).filter((p): p is string => p !== null)
      : [];
    if (code && errores.length > 0) return `${code} ${errores.join(" | ")}`;
    if (code) return code;
  }

  return null;
};

export const useDocumentoSubmit = ({
  endpoint,
  method = "POST",
  id,
  body,
  onInactivo,
  onSuccess,
}: UseDocumentoSubmitOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // `formData` se usa en el alta: el backend de POST /documentos/ recibe
  // multipart/form-data con el campo `datos` (JSON) y el `archivo` opcional.
  const submit = useCallback(
    async (values?: DocumentoFormData, formData?: FormData): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload = body ?? {
          codigo: values?.codigo || null,
          titulo: values?.titulo ?? "",
          tipo_documento: values?.tipo_documento ?? "",
          descripcion: values?.descripcion || null,
        };

        const url = id ? `${endpoint}${id}/` : endpoint;
        const res = await fetch(url, formData
          // Sin Content-Type manual: el navegador agrega el boundary del multipart
          ? { method, body: formData }
          : {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

        if (!res.ok) {
          let bodyRes: { detail?: unknown } | null = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Ignorar si el backend no devolvió JSON
          }

          const detalle = bodyRes?.detail;

          // Se ataja el caso de reactivación (Soft Delete) si el documento ya existía
          if (
            res.status === 409 &&
            detalle &&
            typeof detalle === "object" &&
            "documento_id" in detalle &&
            typeof (detalle as { documento_id?: unknown }).documento_id === "number"
          ) {
            const documentoId = (detalle as { documento_id: number }).documento_id;
            onInactivo?.(documentoId);
            return { status: "inactivo", documentoId };
          }

          const mensajeError = extraerMensajeError(detalle) ?? (() => {
            switch (res.status) {
              case 400: return "Datos inválidos enviados al servidor.";
              case 404: return "El documento no fue encontrado.";
              case 409: return "Conflicto con los datos ingresados.";
              case 422: return "Los datos enviados no son válidos.";
              case 500: return "Error interno del servidor.";
              default: return `Error ${res.status || "desconocido"}`;
            }
          })();

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