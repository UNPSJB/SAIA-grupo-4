import { useCallback, useEffect, useState } from "react";
import type { EstadoVistaPublica } from "../types";
import {
  actualizarEstadoVistaPublica,
  actualizarIndicadoresVistaPublica,
  obtenerEstadoVistaPublica,
} from "./vistaPublicaApi";

export function useVistaPublicaConfig() {
  const [estado, setEstado] = useState<EstadoVistaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoIndicadores, setGuardandoIndicadores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await obtenerEstadoVistaPublica();
      setEstado(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la configuración de la vista pública.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const actualizar = useCallback(async (activo: boolean): Promise<boolean> => {
    try {
      setGuardando(true);
      setError(null);
      setMensaje(null);
      const data = await actualizarEstadoVistaPublica(activo);
      setEstado(data);
      setMensaje(
        activo
          ? "Vista pública activada. El enlace ya muestra los indicadores."
          : "Vista pública desactivada. El acceso a los indicadores quedó bloqueado.",
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la vista pública.",
      );
      return false;
    } finally {
      setGuardando(false);
    }
  }, []);

  const guardarIndicadores = useCallback(
    async (activos: string[]): Promise<boolean> => {
      try {
        setGuardandoIndicadores(true);
        setError(null);
        setMensaje(null);
        const data = await actualizarIndicadoresVistaPublica(activos);
        setEstado(data);
        setMensaje(
          "Indicadores actualizados. La vista pública ya refleja los cambios.",
        );
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron actualizar los indicadores de la vista pública.",
        );
        return false;
      } finally {
        setGuardandoIndicadores(false);
      }
    },
    [],
  );

  return {
    estado,
    loading,
    guardando,
    guardandoIndicadores,
    error,
    mensaje,
    cargar,
    actualizar,
    guardarIndicadores,
  };
}
