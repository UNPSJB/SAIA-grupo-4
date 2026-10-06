import { useCallback, useState } from "react";
import { BASE_URL } from "../../../config";
import type { EjecucionTarea, RegistroConsumoQuimico } from "../types";

const CHECKLISTS_URL = `${BASE_URL}/checklists`;

export type CompletarResultado =
  | { status: "success"; ejecucion: EjecucionTarea }
  | { status: "error"; message: string };

interface UseCompletarTareaOptions {
  operadorId: number;
  onSuccess?: () => void;
}

// Marca una ejecución como completada. El endpoint es un PATCH multipart: el
// campo "datos" lleva el JSON (CompletarEjecucion) y "foto" el archivo opcional.
export const useCompletarTarea = ({
  operadorId,
  onSuccess,
}: UseCompletarTareaOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completarTarea = useCallback(
    async (
      ejecucionId: number,
      consumos: RegistroConsumoQuimico[],
      observaciones: string | null,
      foto: File | null,
    ): Promise<CompletarResultado> => {
      setIsSubmitting(true);

      try {
        const formData = new FormData();
        formData.append(
          "datos",
          JSON.stringify({
            operador_id: operadorId,
            observaciones: observaciones?.trim() ? observaciones.trim() : null,
            consumos,
          }),
        );
        if (foto) formData.append("foto", foto);

        // No se setea Content-Type: el browser agrega el boundary del multipart.
        const res = await fetch(`${CHECKLISTS_URL}/${ejecucionId}/completar`, {
          method: "PATCH",
          body: formData,
        });

        if (!res.ok) {
          let bodyRes: unknown = null;
          try {
            bodyRes = await res.json();
          } catch {
            // Si la respuesta no es JSON, bodyRes queda en null.
          }

          return {
            status: "error",
            message: extraerMensajeError(bodyRes, res.status),
          };
        }

        const ejecucion = (await res.json()) as EjecucionTarea;
        onSuccess?.();
        return { status: "success", ejecucion };
      } catch {
        return {
          status: "error",
          message: "Ocurrió un error de red o inesperado",
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [operadorId, onSuccess],
  );

  return { completarTarea, isSubmitting };
};

// El backend responde siempre con { detail }, que puede ser un texto (404/409 de
// dominio) o un objeto con "code" (errores de validación de pydantic).
const extraerMensajeError = (bodyRes: unknown, status: number): string => {
  const detail = (bodyRes as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const { code } = detail as { code?: unknown };
    if (typeof code === "string") return code;
  }

  switch (status) {
    case 400:
      return "Los datos enviados no son válidos.";
    case 404:
      return "La tarea indicada no existe.";
    case 409:
      return "Esta tarea ya fue completada o venció, no se puede modificar.";
    case 500:
      return "Error interno del servidor.";
    default:
      return `Error ${status || "desconocido"}`;
  }
};
