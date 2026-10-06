import { createContext, useContext } from "react";
import type { Vencimiento } from "../types";

export interface RenovacionContextValue {
  /** Abre el modal de renovación para una fila. */
  abrir: (v: Vencimiento) => void;
  /** Cierra sin guardar. */
  cerrar: () => void;
  /**
   * Se incrementa con cada guardado. La campana lo mira para volver a pedir
   * sus pendientes: el badge tiene que bajar sin depender de navegar.
   */
  versionGuardado: number;
  /** Lo llama cualquier pantalla que guarde una renovación. */
  notificarGuardado: () => void;
}

export const RenovacionContext = createContext<RenovacionContextValue | null>(
  null,
);

// Hook de acceso. Lanza error si se usa fuera del <RenovacionProvider>.
export const useRenovacion = () => {
  const ctx = useContext(RenovacionContext);
  if (!ctx)
    throw new Error("useRenovacion debe usarse dentro de <RenovacionProvider>");
  return ctx;
};
