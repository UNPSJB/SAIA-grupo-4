import { BASE_URL } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import {
  extraerDetalleBaja,
  type AsociacionOperativa,
} from "../../../components/ui";
import type { Documento } from "../types";

interface HandleDeleteOptions {
  documento: Documento | null;
  motivo?: string;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  setAsociaciones?: (asocs: AsociacionOperativa[]) => void;
  onSuccess?: () => void;
}

export const handleDelete = async ({
  documento,
  motivo,
  setLoading,
  setError,
  setAsociaciones,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!documento) return;
  setLoading(true);
  setError("");
  setAsociaciones?.([]);

  try {
    const params = new URLSearchParams();
    if (motivo?.trim()) params.set("motivo", motivo.trim());
    const qs = params.toString();

    const res = await apiFetch(
      `${BASE_URL}/documentos/${documento.id}${qs ? `?${qs}` : ""}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      let bodyRes: { detail?: unknown } | null = null;
      try {
        bodyRes = await res.json();
      } catch {
        // El backend no devolvió JSON
      }
      const { mensaje, asociaciones } = extraerDetalleBaja(
        bodyRes?.detail,
        "No se pudo dar de baja el documento.",
      );
      setAsociaciones?.(asociaciones);
      setError(mensaje);
      return;
    }

    onSuccess?.();
  } catch {
    setError("Ocurrió un error de red al intentar comunicarse con el servidor.");
  } finally {
    setLoading(false);
  }
};