import { useCallback, useEffect, useState } from "react";
import { BASE_URL } from "../../../config";
import type { EstadisticaTipoIncidente } from "../types";

const ENDPOINT = `${BASE_URL}/incidentes/estadisticas`;
const REFRESCO_MS = 30_000;

interface Options {
  desde: string;
  hasta: string;
}

export const useEstadisticasIncidentes = ({ desde, hasta }: Options) => {
  const [estadisticas, setEstadisticas] = useState<EstadisticaTipoIncidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  }, []);

  // Refresco automático en segundo plano (no activa el loading)
  useEffect(() => {
    const id = setInterval(() => setReloadKey((k) => k + 1), REFRESCO_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ desde, hasta });

    fetch(`${ENDPOINT}?${params.toString()}`)
      .then(async (res) => {
        if (res.ok) return (await res.json()) as EstadisticaTipoIncidente[];
        const body = await res.json().catch(() => null);
        const detail = (body as { detail?: unknown } | null)?.detail;
        if (typeof detail === "string") throw new Error(detail);
        throw new Error("No se pudo cargar la estadística de incidentes.");
      })
      .then((json) => {
        if (!active) return;
        // Evitamos setear un array nuevo si el contenido no cambió: así recharts
        // no re-anima las barras en cada refresco en segundo plano (parpadeo).
        setEstadisticas((actual) =>
          JSON.stringify(actual) === JSON.stringify(json) ? actual : json,
        );
        setError("");
      })
      .catch((err: Error) => {
        if (!active) return;
        setEstadisticas([]);
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [desde, hasta, reloadKey]);

  return { estadisticas, loading, error, reload };
};