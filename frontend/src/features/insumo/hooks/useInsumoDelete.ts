import type { Insumo } from "../types";

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
    if (!res.ok) throw new Error(`Error ${res.status}`);
    onSuccess?.();
  } catch (err: any) {
    const errorCode = err.message?.match(/Error (\d+)/)?.[1] ?? "";
    let mensajeError = "No se pudo eliminar el insumo.";
    switch (errorCode) {
      case "400":
        mensajeError = "El insumo ya esta dado de baja";
        break;
      case "404":
        mensajeError = "El insumo no existe.";
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
