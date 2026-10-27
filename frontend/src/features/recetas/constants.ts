import type { EstadoReceta } from "./types";

export const ESTADOS_RECETA: Record<
  EstadoReceta,
  { texto: string; color: string }
> = {
  BORRADOR: { texto: "Borrador", color: "orange" },
  ACTIVA: { texto: "Activa", color: "green" },
  INHABILITADA: { texto: "Inhabilitada", color: "red" },
};
