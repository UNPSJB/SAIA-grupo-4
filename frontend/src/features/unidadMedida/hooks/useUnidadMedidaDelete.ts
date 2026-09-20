import type { UnidadMedida } from "../types";

type FastApiError = {
  detail?: string | { code?: string; unidad_medida_id?: number };
};

interface HandleDeleteOptions {
  unidad: UnidadMedida | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({
  unidad,
  setLoading,
  setError,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!unidad) return;
  setLoading(true);
  setError("");

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/unidades-de-medida/${unidad.id}`,
      { method: "DELETE" },
    );

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
            mensajeError = "La unidad de medida ya esta dado de baja";
            break;
          case 404:
            mensajeError = "La unidad de medida no existe.";
            break;
          case 409:
            mensajeError =
              "No se puede eliminar una unidad de medida asociada a un insumo activo.";
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