import type { EstadoVencimiento } from "./types";

/**
 * Filtros del tablero de vencimientos, como borrador.
 *
 * Va en su propio archivo, y no junto al componente, porque `react-refresh`
 * exige que un archivo de componente exporte únicamente componentes.
 */
export type FiltrosVencimientos = {
  estado: EstadoVencimiento | "";
  categoria: string;
};

/** Sin filtros: deja el corte por defecto del backend (15 días). */
export const FILTROS_INICIALES: FiltrosVencimientos = {
  estado: "",
  categoria: "",
};

/** Si hay algo que limpiar en la barra de filtros. */
export const tieneFiltros = (filtros: FiltrosVencimientos) =>
  filtros.estado !== "" || filtros.categoria !== "";