import type { EstadoLote } from "./types";

export const ETIQUETA_ESTADO_LOTE: Record<EstadoLote, string> = {
  activo: "Activo",
  vencido: "Vencido",
  inhabilitado: "Inhabilitado",
  agotado: "Agotado",
};

export const COLOR_ESTADO_LOTE: Record<EstadoLote, string> = {
  activo: "green",
  vencido: "red",
  inhabilitado: "gray",
  agotado: "blue",
};