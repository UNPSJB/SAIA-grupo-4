import { createContext } from "react";
import type { ConfiguracionPublica } from "./types";

export interface ConfiguracionContextType {
  configuracion: ConfiguracionPublica;
  logoSrc: string | null;
  loading: boolean;
  recargarConfiguracion: () => Promise<void>;
}

export const CONFIGURACION_FALLBACK: ConfiguracionPublica = {
  nombre_establecimiento: "SAIA-4",
  logo_url: null,
  direccion: null,
  localidad: null,
  provincia: null,
  telefono: null,
  email: null,
  sitio_web: null,
  pie_informes: null,
};

export const ConfiguracionContext = createContext<ConfiguracionContextType>({
  configuracion: CONFIGURACION_FALLBACK,
  logoSrc: null,
  loading: false,
  recargarConfiguracion: async () => {},
});