import type { CategoriaVencimiento, EstadoVencimiento } from "./types";

export type EntradaRenovacion = {
  /** Texto del botón de fila y del `title`. */
  etiqueta: string;
  colorPalette: string;
  /** Título del formulario dentro del modal. */
  titulo: string;
  /** Si se define, el botón solo aparece en filas con ese estado. */
  soloEstado?: EstadoVencimiento;
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
  documento: {
    etiqueta: "Gestionar Revisión",
    colorPalette: "green",
    titulo: "Gestionar revisión de documento",
  },
  personal: {
    etiqueta: "Renovar Vencimiento",
    colorPalette: "green",
    titulo: "Renovar Vencimiento",
  },
  lote_insumo: {
    etiqueta: "Dar de baja",
    colorPalette: "red",
    titulo: "Dar de baja lote vencido",
    soloEstado: "vencido",
  },
};

/** Configuración de renovación de una categoría, o null si no la admite. */
export const renovacionDe = (
  categoria: CategoriaVencimiento,
): EntradaRenovacion | null => RENOVACIONES[categoria] ?? null;

/** Si esta fila puntual admite renovación (según su categoría y su estado). */
export const puedeRenovar = (v: {
  categoria: CategoriaVencimiento;
  estado: EstadoVencimiento;
}): boolean => {
  const entrada = renovacionDe(v.categoria);
  if (!entrada) return false;
  return !entrada.soloEstado || entrada.soloEstado === v.estado;
};