import type { UnidadMedida } from "../types";

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
    if (!res.ok) throw new Error(`Error ${res.status}`);
    onSuccess?.();
  } catch (err) {
    const errorCode =
      err instanceof Error ? (err.message?.match(/Error (\d+)/)?.[1] ?? "") : "";
    let mensajeError: string;
    switch (errorCode) {
      case "400":
        mensajeError = "La unidad de medida ya esta dado de baja";
        break;
      case "404":
        mensajeError = "La unidad de medida no existe.";
        break;
      case "409":
        mensajeError =
          "No se puede eliminar una unidad de medida asociada a un insumo activo.";
        break;
      case "500":
        mensajeError = "Error interno del servidor.";
        break;
      default:
        mensajeError = `Error ${errorCode || "desconocido"}`;
    }
    setError(mensajeError);
  } finally {
    setLoading(false);
  }
};