import type { Sector } from "../types";

interface HandleDeleteOptions {
  sector: Sector | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({
  sector,
  setLoading,
  setError,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!sector) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/sectores/${sector.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: any = null;
      try {
        bodyRes = await res.json();
      } catch {
        // Si no manda JSON, queda en null
      }

      let mensajeError = "No se pudo eliminar el sector.";

      // 1. Extraer el mensaje exacto que manda FastAPI
      if (bodyRes?.detail) {
        if (typeof bodyRes.detail === "string") {
          mensajeError = bodyRes.detail;
        } else if (typeof bodyRes.detail.code === "string") {
          mensajeError = bodyRes.detail.code;
        }
      } else {
        // 2. Fallback a los mensajes genéricos por status HTTP
        switch (res.status) {
          case 400:
            mensajeError = "El sector ya se encuentra dado de baja.";
            break;
          case 404:
            mensajeError = "El sector no existe.";
            break;
          case 409:
            mensajeError = "No se puede eliminar el sector porque tiene equipos asociados.";
            break;
          case 500:
            mensajeError = "Error interno del servidor.";
            break;
          default:
            mensajeError = `Error ${res.status || "desconocido"}`;
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