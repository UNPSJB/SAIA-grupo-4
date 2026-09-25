import type { InsumoQuimico } from "../types";

type FastApiError = {
  detail?: string | { code?: string; insumo_id?: number };
};

interface HandleDeleteOptions {
  insumoQuimico: InsumoQuimico | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({
  insumoQuimico,
  setLoading,
  setError,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!insumoQuimico) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`http://127.0.0.1:8000/insumos-quimicos/${insumoQuimico.id}`, {
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
            mensajeError = "El insumo químico ya esta dado de baja.";
            break;
          case 404:
            mensajeError = "El insumo químico no existe.";
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