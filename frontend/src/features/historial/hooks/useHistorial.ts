import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../../../features/auth/apiFetch";
import { BASE_URL } from "../../../config";
import type { EjecucionTarea } from "../../checklists/types";

const HISTORIAL_URL = `${BASE_URL}/checklists/historial`;

interface UseHistorialOptions {
  // Rango ya aplicado por el usuario (no el borrador del filtro): así cambiar
  // las fechas en el formulario no dispara una request por cada tecla.
  desde: string;
  hasta: string;
}

export const useHistorial = ({ desde, hasta }: UseHistorialOptions) => {
  const [ejecuciones, setEjecuciones] = useState<EjecucionTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams({ desde, hasta });

    apiFetch(`${HISTORIAL_URL}?${params.toString()}`)
      .then(async (res) => {
        if (res.ok) return (await res.json()) as EjecucionTarea[];

        // El backend rechaza con 400 los rangos inválidos o con fecha futura.
        const body = await res.json().catch(() => null);
        const detail = (body as { detail?: unknown } | null)?.detail;
        if (typeof detail === "string") throw new Error(detail);
        throw new Error("No se pudo cargar el historial de checklists.");
      })
      .then((json: EjecucionTarea[]) => {
        if (!active) return;
        setEjecuciones(json);
        setError("");
      })
      .catch((err: Error) => {
        if (!active) return;
        setEjecuciones([]);
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [desde, hasta, reloadKey]);

  return { ejecuciones, loading, error, reload };
};
