import type { CategoriaVencimiento, EstadoVencimiento } from "./types";

export const BASE_URL = "http://127.0.0.1:8000";

/**
 * Arma el endpoint de la vista consolidada.
 *
 * No se manda `dias_max`: el backend aplica su corte por defecto de 15 dias y lo
 * levanta automaticamente cuando estado=vigente. Mandarlo desde aca duplicaria
 * una regla que ya es del servidor.
 */
export const construirEndpoint = (
  estado: EstadoVencimiento | "",
  categoria: string,
) => {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (categoria) params.set("categoria", categoria);

  const query = params.toString();
  return `${BASE_URL}/vencimientos/${query ? `?${query}` : ""}`;
};

/**
 * Color de la columna "Categoría".
 *
 * Un color por categoría y no por estado: si la categoría tomara el color del
 * estado, dos filas de "Elementos de limpieza" aparecerían con colores
 * distintos y el filtro dejaría de ser legible.
 */
export const COLOR_CATEGORIA: Record<CategoriaVencimiento, string> = {
  personal: "purple",
  equipo: "blue",
  elemento_limpieza: "teal",
  documento: "orange",
};