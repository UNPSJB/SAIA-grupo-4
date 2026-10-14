import { apiFetch } from "../features/auth/apiFetch";
import { ITEMS_POR_PAGINA } from "../config";
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
    pageSize = ITEMS_POR_PAGINA,
    refreshKey = 0,
    errorMessage = "No se pudo cargar la lista de datos.",
  }: ListadoDataOptions,
) => {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Identidad de la petición: cambia cuando hay que volver a pedir los datos.
  const clave = JSON.stringify([endpoint, refreshKey, reloadKey, errorMessage]);

  // La página se guarda junto con la clave con la que fue elegida. Si la
  // petición cambia (filtro, recarga, endpoint) la página vuelve a 1 sin usar un
  // efecto (evita el patrón set-state-in-effect); así una lista más corta no
  // deja al usuario mirando una página vacía.
  const [paginacion, setPaginacion] = useState<{ clave: string; page: number }>({
    clave,
    page: 1,
  });
  const page = paginacion.clave === clave ? paginacion.page : 1;

  const setPage = useCallback(
    (valor: number | ((anterior: number) => number)) => {
      setPaginacion((prev) => {
        const actual = prev.clave === clave ? prev.page : 1;
        const siguiente =
          typeof valor === "function"
            ? (valor as (anterior: number) => number)(actual)
            : valor;
        return { clave, page: Math.max(1, siguiente) };
      });
    },
    [clave],
  );

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
    apiFetch(endpoint)
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

  // Tope de páginas según los datos recibidos. Si la lista se acorta (un delete,
  // un filtro), la página efectiva se ajusta para no quedar fuera de rango.
  const totalPaginas = Math.max(1, Math.ceil(data.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);

  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * pageSize;
    return data.slice(inicio, inicio + pageSize);
  }, [data, paginaActual, pageSize]);

  return {
    data,
    loading,
    error,
    page: paginaActual,
    setPage,
    pageSize,
    itemsPaginados,
    reload,
  };
};
