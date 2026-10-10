import type { FiltroEstadoVencimiento } from "./types";

/**
 * Filtros del tablero de vencimientos, como borrador.
 *
 * Va en su propio archivo, y no junto al componente, porque `react-refresh`
 * exige que un archivo de componente exporte únicamente componentes.
 */
export type FiltrosVencimientos = {
  estado: FiltroEstadoVencimiento | "";
  categoria: string;
  /**
   * Ventana de días, como texto.
   *
   * Vacío significa "sin límite": el backend devuelve todo. Es texto y no
   * número para poder distinguir "sin límite" de "0", y para no decidir aca
   * qué es un valor válido.
   */
  dias: string;
};

/** Sin filtros: todo el listado, sin recorte de ventana. */
export const FILTROS_INICIALES: FiltrosVencimientos = {
  estado: "",
  categoria: "",
  dias: "",
};

/** Si hay algo que limpiar en la barra de filtros. */
export const tieneFiltros = (filtros: FiltrosVencimientos) =>
  filtros.estado !== "" || filtros.categoria !== "" || filtros.dias !== "";
