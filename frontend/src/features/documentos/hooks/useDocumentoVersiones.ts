import { useCallback, useState } from "react";
import type { RegistrarRevisionFormData, SubirVersionFormData } from "../types";
import { extraerMensajeError } from "./useDocumentoSubmit";

// Los estados de respuesta que maneja la UI
export type VersionSubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

// Rutas reales del backend (sin "/api": no hay proxy y esas URLs daban 404)
const BASE_URL = "http://127.0.0.1:8000/documentos";

// Lee el error de FastAPI tal cual lo devuelve (string, lista de 422 u objeto {code})
const leerError = async (res: Response): Promise<string> => {
  let detalle: unknown = null;
  try {
    const body = (await res.json()) as { detail?: unknown };
    detalle = body?.detail;
  } catch {
    /* El backend no devolvió JSON */
  }
  return extraerMensajeError(detalle) ?? `Error ${res.status}`;
};

export const useDocumentoVersiones = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sube una NUEVA VERSIÓN y la deja vigente ("Subir y Activar").
  // Backend: POST .../versiones (multipart: campo `datos` JSON + `archivo`) y
  // luego PATCH .../versiones/{id}/vigencia, porque la versión ingresa como NO
  // vigente y recién la segunda llamada archiva a la anterior.
  const subirNuevaVersion = useCallback(
    async (
      documentoId: number,
      data: SubirVersionFormData,
      creadoPorId: number,
    ): Promise<VersionSubmitResult> => {
      setIsSubmitting(true);
      try {
        if (!data.archivo) {
          return { status: "error", message: "Debes adjuntar un archivo PDF" };
        }

        const datos: Record<string, unknown> = {
          version: data.version,
          creado_por_id: creadoPorId,
        };
        if (data.fecha_proxima_revision) datos.fecha_proxima_revision = data.fecha_proxima_revision;
        if (data.observaciones_cambio?.trim()) datos.observaciones_cambio = data.observaciones_cambio.trim();

        const formData = new FormData();
        formData.append("datos", JSON.stringify(datos));
        formData.append("archivo", data.archivo);

        const res = await fetch(`${BASE_URL}/${documentoId}/versiones`, {
          method: "POST",
          // Sin Content-Type manual: fetch agrega el boundary del multipart
          body: formData,
        });
        if (!res.ok) return { status: "error", message: await leerError(res) };

        const nuevaVersion = (await res.json()) as { id?: number };
        if (!nuevaVersion.id) {
          return { status: "error", message: "La versión se subió, pero el backend no devolvió su id" };
        }

        // Segundo paso: activar la recién subida (la anterior queda histórica)
        const resVigencia = await fetch(
          `${BASE_URL}/${documentoId}/versiones/${nuevaVersion.id}/vigencia`,
          { method: "PATCH" },
        );
        if (!resVigencia.ok) {
          return {
            status: "error",
            message: `La versión se subió pero no se pudo activar: ${await leerError(resVigencia)}`,
          };
        }

        return { status: "success" };
      } catch {
        return { status: "error", message: "Ocurrió un error de red" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  // Registra una revisión periódica SIN subir un PDF nuevo (JSON).
  // Backend: PATCH .../versiones/{versionId}/renovar — actualiza la fecha si
  // viene informada y crea una fila en el historial de revisiones.
  const registrarRevision = useCallback(
    async (
      documentoId: number,
      versionId: number,
      data: RegistrarRevisionFormData,
    ): Promise<VersionSubmitResult> => {
      setIsSubmitting(true);
      try {
        const payload: Record<string, unknown> = {};
        if (data.fecha_proxima_revision) payload.fecha_proxima_revision = data.fecha_proxima_revision;
        if (data.observaciones?.trim()) payload.observaciones = data.observaciones.trim();
        if (data.registrado_por_id) payload.registrado_por_id = data.registrado_por_id;

        const res = await fetch(`${BASE_URL}/${documentoId}/versiones/${versionId}/renovar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) return { status: "error", message: await leerError(res) };
        return { status: "success" };
      } catch {
        return { status: "error", message: "Ocurrió un error de red" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  // Activa una versión (histórica o nueva): la vigente pasa a histórica.
  // Backend: PATCH .../versiones/{versionId}/vigencia
  const activarVersion = useCallback(
    async (documentoId: number, versionId: number): Promise<VersionSubmitResult> => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`${BASE_URL}/${documentoId}/versiones/${versionId}/vigencia`, {
          method: "PATCH",
        });

        if (!res.ok) return { status: "error", message: await leerError(res) };
        return { status: "success" };
      } catch {
        return { status: "error", message: "Ocurrió un error de red" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { subirNuevaVersion, registrarRevision, activarVersion, isSubmitting };
};
