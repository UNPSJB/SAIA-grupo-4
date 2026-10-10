import { useCallback, useState } from "react";

export type SubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

export interface VencimientoPayload {
  persona_id: number;
  documento_id: number;
  fecha_vencimiento: string;
  // Si viene, se renueva ese vencimiento (PATCH); si no, se carga uno nuevo (POST)
  vencimiento_id?: number;
  comprobante?: File | null;
}

interface UseVencimientoSubmitOptions {
  onSuccess?: () => void;
}

const ENDPOINT = "http://127.0.0.1:8000/personal/";

const leerMensajeError = async (res: Response): Promise<string> => {
  let bodyRes: { detail?: unknown } | null = null;
  try { bodyRes = await res.json(); } catch { /* respuesta sin JSON */ }

  const detail = bodyRes?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;

  switch (res.status) {
    case 400: return "Datos inválidos enviados al servidor.";
    case 404: return "La persona o el documento no fueron encontrados.";
    case 409: return "Conflicto con los datos ingresados.";
    case 500: return "Error interno del servidor.";
    default: return `Error ${res.status || "desconocido"}`;
  }
};

export const useVencimientoSubmit = ({ onSuccess }: UseVencimientoSubmitOptions = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (values: VencimientoPayload): Promise<SubmitResult> => {
      setIsSubmitting(true);
      try {
        const base = `${ENDPOINT}${values.persona_id}/vencimientos`;
        const esRenovacion = values.vencimiento_id !== undefined;

        const res = await fetch(esRenovacion ? `${base}/${values.vencimiento_id}` : base, {
          method: esRenovacion ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            esRenovacion
              ? { fecha_vencimiento: values.fecha_vencimiento }
              : { documento_id: values.documento_id, fecha_vencimiento: values.fecha_vencimiento },
          ),
        });

        if (!res.ok) return { status: "error", message: await leerMensajeError(res) };

        if (values.comprobante) {
          const vencimiento: { id: number } = await res.json();
          const formData = new FormData();
          formData.append("comprobante", values.comprobante);

          const resComprobante = await fetch(`${base}/${vencimiento.id}/comprobante`, { method: "POST", body: formData });
          if (!resComprobante.ok) {
            const motivo = await leerMensajeError(resComprobante);
            return { status: "error", message: `El vencimiento se guardó, pero no se pudo adjuntar el comprobante: ${motivo}` };
          }
        }

        onSuccess?.();
        return { status: "success" };
      } catch {
        return { status: "error", message: "Ocurrió un error de red o inesperado" };
      } finally {
        setIsSubmitting(false);
      }
    }, [onSuccess]
  );

  return { submit, isSubmitting };
};
