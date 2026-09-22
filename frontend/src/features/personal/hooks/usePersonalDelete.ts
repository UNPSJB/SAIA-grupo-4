import type { Persona } from "../types";

interface HandleDeleteOptions {
  persona: Persona | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({ persona, setLoading, setError, onSuccess }: HandleDeleteOptions) => {
  if (!persona) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/personal/${persona.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: any = null;
      try { bodyRes = await res.json(); } catch {}

      let mensajeError = "No se pudo eliminar la persona.";

      if (bodyRes?.detail) {
        if (typeof bodyRes.detail === "string") mensajeError = bodyRes.detail;
        else if (typeof bodyRes.detail.code === "string") mensajeError = bodyRes.detail.code;
      } else {
        switch (res.status) {
          case 400: mensajeError = "La acción no está permitida."; break;
          case 404: mensajeError = "La persona no existe."; break;
          case 409: mensajeError = "Conflicto al intentar eliminar la persona."; break;
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