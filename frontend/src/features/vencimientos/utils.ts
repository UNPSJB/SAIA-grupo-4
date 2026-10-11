import { BASE_URL } from "../../config";
import type { CategoriaVencimiento, FiltroEstadoVencimiento } from "./types";

// Reexportado porque el resto de `features/vencimientos` lo importa de acá.
export { BASE_URL };

/**
 * Arma el endpoint de la vista consolidada.
 *
 * `dias_ventana` es la ventana simetrica del tablero: acota lo que vencio o
 * vence dentro de N dias (`|dias_restantes| <= N`). No mandarlo significa "sin
 * recorte": el backend devuelve vencidos, proximos y vigentes, y el semaforo
 * sigue clasificando con su propio umbral de 15 dias, que es otro concepto. A
 * diferencia de `dias_max` (la cota superior unilateral de la campana), la
 * ventana tiene efecto en todos los estados, incluido "vigente". Un valor
 * negativo o con decimales se ignora en vez de mandarse a error: el filtro no
 * deberia poder romper la consulta.
 */
export const construirEndpoint = (
  estado: FiltroEstadoVencimiento | "",
  categoria: string,
  dias: string,
) => {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (categoria) params.set("categoria", categoria);

  const diasMax = Number(dias.trim());
  if (dias.trim() !== "" && Number.isInteger(diasMax) && diasMax >= 0) {
    params.set("dias_ventana", String(diasMax));
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
