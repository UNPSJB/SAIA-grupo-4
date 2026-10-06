import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "../../../config";
import { useListadoData } from "../../../hooks/useListadoData";
import type { Vencimiento } from "../types";

/**
 * Pendientes que muestra la campana.
 *
 * No inventa datos: pide la vista consolidada acotada a 15 dias, que es
 * exactamente el conjunto vencidos + proximos. `_resolver_corte(None, 15)` da
 * 15, de modo que entra todo negativo (vencido) y todo 0..15 (proximo), y
 * queda fuera quien vence mas adelante (vigente).
 *
 * Con eso se ahorran dos cosas: un endpoint nuevo en el backend y filtrar en
 * el cliente. Lo que llega ya es la lista de notificaciones.
 */
const ENDPOINT = `${BASE_URL}/vencimientos/?dias_max=15`;

export const useNotificaciones = () => {
  const { data, loading, error, reload } = useListadoData<Vencimiento>({
    endpoint: ENDPOINT,
    errorMessage: "No se pudieron cargar las notificaciones.",
  });

  const { pathname } = useLocation();

  // El NavBar vive toda la sesion, asi que este hook no vuelve a montarse al
  // navegar. Refrescar cuando cambia la ruta es lo que hace que un recambio
  // hecho desde otra vista se refleje en el badge.
  //
  // El `ref` evita disparar un reload tambien al montar: la primera carga ya la
  // pide `useListadoData` y repetirla duplicaria el request inicial.
  const rutaAnterior = useRef(pathname);
  useEffect(() => {
    if (rutaAnterior.current === pathname) return;
    rutaAnterior.current = pathname;
    reload();
  }, [pathname, reload]);

  // Al volver a la pestana. Sin setInterval: el proyecto no hace polling en
  // ninguna parte y un timer que corre para siempre suma ruido sin aportar.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [reload]);

  return {
    /** Filas pendientes, ordenadas por urgencia (lo mas negativo primero). */
    pendientes: data,
    /** Numero para el badge. */
    total: data.length,
    /**
     * Solo la primera carga. Durante un refresque `data` conserva la lista
     * anterior, asi que el badge no parpadea a cero mientras se vuelve a pedir.
     */
    inicial: loading && data.length === 0,
    error,
    /** Vuelve a pedir los datos. Tras guardar una resolucion. */
    recargar: reload,
  };
};
