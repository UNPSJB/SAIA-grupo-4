import { useState, useEffect, useMemo, useCallback } from "react";

interface ListadoDataOptions {
  endpoint: string;
  pageSize?: number;
  refreshKey?: number;
  errorMessage?: string;
}

export const useListadoData = <T>(
  {
    endpoint,
    pageSize = 5,
    refreshKey = 0,
    errorMessage = "No se pudo cargar la lista de datos.",
  }: ListadoDataOptions,
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(endpoint)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        return res.json();
      })
      .then((json: T[]) => {
        if (active) {
          setData(json);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(errorMessage);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [endpoint, refreshKey, reloadKey, errorMessage]);

  const itemsPaginados = useMemo(() => {
    const inicio = (page - 1) * pageSize;
    return data.slice(inicio, inicio + pageSize);
  }, [data, page, pageSize]);

  return { data, loading, error, page, setPage, pageSize, itemsPaginados, reload };
};