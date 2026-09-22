import type { Capacidad } from "../types";

interface HandleDeleteOptions {
  capacidad: Capacidad | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({ capacidad, setLoading, setError, onSuccess }: HandleDeleteOptions) => {
  if (!capacidad) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/capacidades/${capacidad.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: any = null;
      try { bodyRes = await res.json(); } catch {}

      let mensajeError = "No se pudo eliminar la capacidad.";

      if (bodyRes?.detail) {
        if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
        else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
      } else {
        switch (res.status) {
          case 400: mensajeError = "La acción no está permitida."; break;
          case 404: mensajeError = "La capacidad no existe."; break;
          case 409: mensajeError = "Conflicto al intentar eliminar la capacidad."; break;
          case 500: mensajeError = "Error interno del servidor."; break;
          default: mensajeError = `Error ${res.status || "desconocido"}`;
        }
      }

      setError(mensajeError);
      setLoading(false);
      return;
    }

    onSuccess?.();
  } catch (err) {
    setError("Ocurrió un error de red al intentar comunicarse con el servidor.");
  } finally {
    setLoading(false);
  }
};