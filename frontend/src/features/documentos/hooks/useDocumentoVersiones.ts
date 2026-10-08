import { useCallback, useState } from "react";
import type { SubirVersionFormData, RegistrarRevisionFormData } from "../types";

// Los estados de respuesta que maneja la UI
export type VersionSubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

export const useDocumentoVersiones = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper interno para leer los errores de FastAPI tal cual los devuelve el backend
  const handleApiError = async (res: Response): Promise<string> => {
    let bodyRes: { detail?: unknown } | null = null;
    try { bodyRes = await res.json(); } catch { /* El backend no devolvió JSON */ }

    const detalle = bodyRes?.detail;
    if (detalle !== undefined && detalle !== null) {
      if (typeof detalle === "string") return detalle;
      if (typeof detalle === "object" && "code" in detalle && typeof detalle.code === "string") return detalle.code;
      return "Ocurrió un error";
    }
    return `Error ${res.status}`;
  };

  // Subir una NUEVA VERSIÓN (Usa FormData porque se envia un PDF físico)
  const subirNuevaVersion = useCallback(async (documentoId: number, data: SubirVersionFormData): Promise<VersionSubmitResult> => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (data.archivo) formData.append("archivo", data.archivo);
      formData.append("version", data.version);
      formData.append("fecha_proxima_revision", data.fecha_proxima_revision);
      if (data.observaciones_cambio) formData.append("observaciones_cambio", data.observaciones_cambio);

      const res = await fetch(`/api/documentos/${documentoId}/versiones/`, {
        method: "POST",
        // No se setea el Content-Type. fetch se encarga de poner "multipart/form-data" automáticamente
        body: formData, 
      });

      if (!res.ok) {
        return { status: "error", message: await handleApiError(res) };
      }
      return { status: "success" };
    } catch {
      return { status: "error", message: "Ocurrió un error de red" };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Registrar que se revisó el documento pero SIGUE VIGENTE EL MISMO PDF (Usa JSON)
  const registrarRevision = useCallback(async (versionId: number, data: RegistrarRevisionFormData): Promise<VersionSubmitResult> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documentos/versiones/${versionId}/revision/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) return { status: "error", message: await handleApiError(res) };
      return { status: "success" };
    } catch {
      return { status: "error", message: "Ocurrió un error de red" };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Hacer ROLLBACK a una versión anterior (Ej: volver de la v1.1 a la v1.0)
  const activarVersionAnterior = useCallback(async (versionId: number): Promise<VersionSubmitResult> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documentos/versiones/${versionId}/activar/`, {
        method: "POST", 
      });

      if (!res.ok) return { status: "error", message: await handleApiError(res) };
      return { status: "success" };
    } catch {
      return { status: "error", message: "Ocurrió un error de red" };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { subirNuevaVersion, registrarRevision, activarVersionAnterior, isSubmitting };
};