import type { FormatoExportacion } from "./tipos";

/** "Insumos químicos" → "insumos-quimicos". */
export const slug = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "listado";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** "20261109-1742": ordena bien alfabéticamente y no se pisa entre exportaciones. */
export const marcaDeTiempo = (fecha = new Date()): string =>
  `${fecha.getFullYear()}${dosDigitos(fecha.getMonth() + 1)}${dosDigitos(fecha.getDate())}` +
  `-${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}`;

/** "insumos-quimicos_20261109-1742.csv" */
export const nombreArchivo = (
  base: string,
  formato: FormatoExportacion,
  fecha = new Date(),
): string => `${slug(base)}_${marcaDeTiempo(fecha)}.${formato}`;
