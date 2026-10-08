import type { Documento } from "../types";

interface HandleDeleteOptions {
  documento: Documento | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({ documento, setLoading, setError, onSuccess }: HandleDeleteOptions) => {
  if (!documento) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/documentos/${documento.id}/`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: { detail?: unknown } | null = null;
      try { bodyRes = await res.json(); } catch { /* El backend no devolvió JSON */ }

      let mensajeError = "No se pudo dar de baja el documento.";
      const detalle = bodyRes?.detail;
      if (detalle !== undefined && detalle !== null) {
        if (typeof detalle === "string") mensajeError = detalle;
        else if (typeof detalle === "object" && "code" in detalle && typeof detalle.code === "string") {
          mensajeError = detalle.code;
        }
      } else {
        switch (res.status) {
          case 400: mensajeError = "La acción no está permitida."; break;
          case 404: mensajeError = "El documento no existe."; break;
          case 500: mensajeError = "Error interno del servidor."; break;
          default: mensajeError = `Error ${res.status || "desconocido"}`;
        }
      }
      setError(mensajeError);
      setLoading(false);
      return;
    }

    onSuccess?.();
  } catch {
    setError("Ocurrió un error de red al intentar comunicarse con el servidor.");
  } finally {
    setLoading(false);
  }
};