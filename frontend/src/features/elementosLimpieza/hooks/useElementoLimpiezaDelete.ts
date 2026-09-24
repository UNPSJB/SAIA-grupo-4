import type { ElementoLimpieza } from "../types";

interface HandleDeleteOptions {
  elemento: ElementoLimpieza | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({ elemento, setLoading, setError, onSuccess }: HandleDeleteOptions) => {
  if (!elemento) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/elementos-limpieza/${elemento.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: any = null;
      try { bodyRes = await res.json(); } catch {}

      let mensajeError = "No se pudo eliminar el elemento.";
      if (bodyRes?.detail) {
        if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
        else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
      } else {
        switch (res.status) {
          case 400: mensajeError = "La acción no está permitida."; break;
          case 404: mensajeError = "El elemento no existe."; break;
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