import type { CategoriaVencimiento } from "./types";

export type EntradaRenovacion = {
  /** Texto del botón de fila y del `title`. */
  etiqueta: string;
  colorPalette: string;
  /** Título del formulario dentro del modal. */
  titulo: string;
};

/**
 * Qué categorías se pueden renovar desde el tablero, y con qué rótulo.
 *
 * Va en su propio archivo, y no junto al componente, porque `react-refresh`
 * exige que un archivo de componente exporte únicamente componentes.
 *
 * No todas las categorías van a poder: renovar un elemento de limpieza es
 * registrar un recambio, pero renovar un documento o un equipo es otra cosa.
 * Cuando una no admita renovación, `renovacionDe` devuelve null y el botón no
 * se renderiza.
 */
const RENOVACIONES: Partial<Record<CategoriaVencimiento, EntradaRenovacion>> = {
  elemento_limpieza: {
    etiqueta: "Registrar Recambio",
    colorPalette: "green",
    titulo: "Registrar Recambio",
  },
  equipo: {
    etiqueta: "Registrar Calibración",
    colorPalette: "green",
    titulo: "Registrar Calibración",
  },
};

/** Configuración de renovación de una categoría, o null si no la admite. */
export const renovacionDe = (
  categoria: CategoriaVencimiento,
): EntradaRenovacion | null => RENOVACIONES[categoria] ?? null;
