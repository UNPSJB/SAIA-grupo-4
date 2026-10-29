import { useCallback, useEffect, useState } from "react";
import type { RespuestaIndicadoresPublicos } from "../types";
import {
  obtenerIndicadoresPublicos,
  VistaPublicaNoEncontradaError,
} from "./publicoApi";

export function useIndicadoresPublicos(token: string | undefined) {
  const [data, setData] = useState<RespuestaIndicadoresPublicos | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);

  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        setNoEncontrada(false);
        const result = await obtenerIndicadoresPublicos(token, signal);
        setData(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        if (err instanceof VistaPublicaNoEncontradaError) {
          setData(null);
          setNoEncontrada(true);
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los indicadores.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar(controller.signal);

    return () => controller.abort();
  }, [cargar, token]);

  // Revalida al volver a la pestana para que una desactivacion se refleje sin
  // obligar a recargar manualmente la pagina.
  useEffect(() => {
    if (!token) return;

    const revalidar = () => {
      if (document.visibilityState === "visible") {
        void cargar();
      }
    };

    window.addEventListener("focus", revalidar);
    document.addEventListener("visibilitychange", revalidar);

    return () => {
      window.removeEventListener("focus", revalidar);
      document.removeEventListener("visibilitychange", revalidar);
    };
  }, [cargar, token]);

  return {
    data,
    loading,
    error,
    noEncontrada,
    recargar: () => {
      void cargar();
    },
  };
}
