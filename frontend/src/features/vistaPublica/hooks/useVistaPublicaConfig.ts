import { useCallback, useEffect, useState } from "react";
import type { EstadoVistaPublica } from "../types";
import {
  actualizarEstadoVistaPublica,
  obtenerEstadoVistaPublica,
} from "./vistaPublicaApi";

export function useVistaPublicaConfig() {
  const [estado, setEstado] = useState<EstadoVistaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
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

  return {
    estado,
    loading,
    guardando,
    error,
    mensaje,
    cargar,
    actualizar,
  };
}
