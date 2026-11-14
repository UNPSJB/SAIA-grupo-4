import { BASE_URL } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type { AlimentoReferencia } from "../types";

interface HandleDeleteOptions {
  alimento: AlimentoReferencia | null;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  onSuccess?: () => void;
}

export const handleDeleteAlimentoReferencia = async ({
  alimento,
  setLoading,
  setError,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!alimento) return;
  setLoading(true);
  setError("");
  try {
    const res = await apiFetch(`${BASE_URL}/alimentos-referencia/${alimento.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      let msg = "No se pudo eliminar el alimento de referencia.";
      try {
        const json = await res.json();
        if (typeof json?.detail === "string") msg = json.detail;
      } catch {
        // ignorar
      }
      setError(msg);
      return;
    }
    onSuccess?.();
  } catch {
    setError("Ocurrió un error de red o inesperado.");
  } finally {
    setLoading(false);
  }
};
