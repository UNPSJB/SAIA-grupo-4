import type { DocumentoPersonal } from "../types";

interface HandleDeleteOptions {
  documento: DocumentoPersonal | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({ documento, setLoading, setError, onSuccess }: HandleDeleteOptions) => {
  if (!documento) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/documentos-personal/${documento.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: { detail?: string | { code?: string } } | null = null;
      try { bodyRes = await res.json(); } catch { /* la respuesta no trae un cuerpo JSON */ }

      let mensajeError = "No se pudo eliminar el documento.";

      if (bodyRes?.detail) {
        if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
        else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
      } else {
        switch (res.status) {
          case 400: mensajeError = "La acción no está permitida."; break;
          case 404: mensajeError = "El documento no existe."; break;
          case 409: mensajeError = "Conflicto al intentar eliminar el documento."; break;
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
