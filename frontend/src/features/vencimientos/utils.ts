import type { CategoriaVencimiento, EstadoVencimiento } from "./types";

export const BASE_URL = "http://127.0.0.1:8000";

/**
 * Arma el endpoint de la vista consolidada.
 *
 * `dias_max` solo se manda si el usuario acota la ventana. No mandar nada
 * significa "sin recorte": el backend devuelve vencidos, próximos y vigentes,
 * y el semáforo sigue clasificando con su propio umbral de 15 días, que es otro
 * concepto. Un valor negativo o con decimales se ignora en vez de mandarse a
 * error: el filtro no debería poder romper la consulta.
 */
export const construirEndpoint = (
  estado: EstadoVencimiento | "",
  categoria: string,
  dias: string,
) => {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (categoria) params.set("categoria", categoria);

  const diasMax = Number(dias.trim());
  if (dias.trim() !== "" && Number.isInteger(diasMax) && diasMax >= 0) {
    params.set("dias_max", String(diasMax));
  }

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