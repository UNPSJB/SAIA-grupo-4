import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { configuracionApi, resolverLogoUrl } from "./configuracionApi";
import {
  CONFIGURACION_FALLBACK,
  ConfiguracionContext,
} from "./ConfiguracionContext";
import type { ConfiguracionPublica } from "./types";

export const ConfiguracionProvider = ({ children }: { children: ReactNode }) => {
  const [configuracion, setConfiguracion] = useState<ConfiguracionPublica>(
    CONFIGURACION_FALLBACK,
  );
  const [loading, setLoading] = useState<boolean>(true);

  const recargarConfiguracion = useCallback(async () => {
    try {
      const data = await configuracionApi.obtenerPublica();
      setConfiguracion({
        ...CONFIGURACION_FALLBACK,
        ...data,
        nombre_establecimiento:
          data.nombre_establecimiento?.trim() || CONFIGURACION_FALLBACK.nombre_establecimiento,
      });
    } catch {
      setConfiguracion((prev) => prev ?? CONFIGURACION_FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
  void recargarConfiguracion();
    void recargarConfiguracion();
  }, [recargarConfiguracion]);

  useEffect(() => {
    const nombre = configuracion.nombre_establecimiento || "SAIA-4";
    document.title = `${nombre} | Gestión de Inocuidad`;
  }, [configuracion.nombre_establecimiento]);

  const logoSrc = useMemo(
    () => resolverLogoUrl(configuracion.logo_url),
    [configuracion.logo_url],
  );

  const value = useMemo(
    () => ({
      configuracion,
      logoSrc,
      loading,
      recargarConfiguracion,
    }),
    [configuracion, logoSrc, loading, recargarConfiguracion],
  );

  return (
    <ConfiguracionContext.Provider value={value}>
      {children}
    </ConfiguracionContext.Provider>
  );
};