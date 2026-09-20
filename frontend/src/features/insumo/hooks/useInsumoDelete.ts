import type { Insumo } from "../types";

type FastApiError = {
  detail?: string | { code?: string; insumo_id?: number };
};

interface HandleDeleteOptions {
  insumo: Insumo | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({
  insumo,
  setLoading,
  setError,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!insumo) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/insumos/${insumo.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let bodyRes: FastApiError | null = null;
      try {
        bodyRes = await res.json();
      } catch {
        // Si la respuesta no es JSON, bodyRes queda en null
      }

      let mensajeError = "Ocurrió un error inesperado";
      if (bodyRes?.detail) {
        if (typeof bodyRes.detail === "string") {
          mensajeError = bodyRes.detail;
        } else if (typeof bodyRes.detail.code === "string") {
          mensajeError = bodyRes.detail.code;
        }
      } else {
        switch (res.status) {
          case 400:
            mensajeError = "El insumo ya esta dado de baja.";
            break;
          case 404:
            mensajeError = "El insumo no existe.";
            break;
          case 500:
            mensajeError = "Error interno del servidor.";
            break;
          default:
            mensajeError = `Error ${res.status || "desconocido"}`;
        }
      }

      setError(mensajeError);
      return;
    }

    onSuccess?.();
  } catch {
    setError("Ocurrió un error de red o inesperado");
  } finally {
    setLoading(false);
  }
};