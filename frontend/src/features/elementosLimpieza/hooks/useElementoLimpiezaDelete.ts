import { apiFetch } from "../../../features/auth/apiFetch";
import { BASE_URL } from "../../../config";
import {
  extraerDetalleBaja,
  type AsociacionOperativa,
} from "../../../components/ui";
import type { ElementoLimpieza } from "../types";

interface HandleDeleteOptions {
  elemento: ElementoLimpieza | null;
  motivo?: string;
  setLoading: (v: boolean) => void;
  setError: (msg: string) => void;
  setAsociaciones?: (asocs: AsociacionOperativa[]) => void;
  onSuccess?: (advertencias?: AsociacionOperativa[]) => void;
}

export const handleDelete = async ({
  elemento,
  motivo,
  setLoading,
  setError,
  setAsociaciones,
  onSuccess,
}: HandleDeleteOptions) => {
  if (!elemento) return;
  setLoading(true);
  setError("");
  setAsociaciones?.([]);

  try {
    const params = new URLSearchParams();
    if (motivo?.trim()) params.set("motivo", motivo.trim());
    const qs = params.toString();

    const res = await apiFetch(
      `${BASE_URL}/elementos-limpieza/${elemento.id}${qs ? `?${qs}` : ""}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      let bodyRes: { detail?: unknown } | null = null;
      try {
        bodyRes = await res.json();
      } catch {
        // sin JSON
      }
      const { mensaje, asociaciones } = extraerDetalleBaja(
        bodyRes?.detail,
        "No se pudo dar de baja el elemento.",
      );
      setAsociaciones?.(asociaciones);
      setError(mensaje);
      return;
    }

    const data = (await res.json().catch(() => null)) as ElementoLimpieza | null;
    onSuccess?.(data?.advertencias_asociaciones ?? []);
  } catch {
    setError("Ocurrió un error de red al intentar comunicarse con el servidor.");
  } finally {
    setLoading(false);
  }
};