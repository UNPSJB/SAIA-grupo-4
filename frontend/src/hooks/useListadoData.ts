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
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Identidad de la petición: cambia cuando hay que volver a pedir los datos.
  const clave = JSON.stringify([endpoint, refreshKey, reloadKey, errorMessage]);

  // Clave del último request que terminó (con éxito o con error). Mientras no
  // coincida con `clave` hay una petición en vuelo.
  //
  // `loading` se deriva de esta comparación en vez de setearse dentro del
  // effect con `setLoading(true)`. Eso último dispara un render extra y React lo
  // marca como anti-patrón (set-state-in-effect): con un filtro que pide datos
  // al backend, hace falta que loading sea verdad desde el mismo render en que
  // cambia la clave, no un render después.
  const [claveResuelta, setClaveResuelta] = useState<string | null>(null);
  const loading = claveResuelta !== clave;

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
          setClaveResuelta(clave);
        }
      });
    return () => {
      active = false;
    };
  }, [clave, endpoint, errorMessage]);

  const itemsPaginados = useMemo(() => {
    const inicio = (page - 1) * pageSize;
    return data.slice(inicio, inicio + pageSize);
  }, [data, page, pageSize]);

  return { data, loading, error, page, setPage, pageSize, itemsPaginados, reload };
};