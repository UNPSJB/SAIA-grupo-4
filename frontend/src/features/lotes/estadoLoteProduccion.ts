import type { EstadoLoteProduccion } from "./types";

export const ETIQUETA_ESTADO_LOTE_PRODUCCION: Record<EstadoLoteProduccion, string> = {
  activo: "Activo",
  vencido: "Vencido",
  retenido: "Retenido",
};

export const COLOR_ESTADO_LOTE_PRODUCCION: Record<EstadoLoteProduccion, string> = {
  activo: "green",
  vencido: "red",
  retenido: "orange",
};
