import { formatearFecha } from "../../utils/fecha";
import type { IndicadoresPublicos } from "./types";

const fechaArchivo = (fecha: string) => formatearFecha(fecha).replace(/\//g, "-");

/**
 * Nombre sugerido al guardar el informe de la vista pública como PDF.
 * Ej: "Indicadores SAIA - 15-10-2026 al 13-11-2026".
 */
export const nombreArchivoIndicadoresPublicos = (indicadores: IndicadoresPublicos) =>
  `Indicadores SAIA - ${fechaArchivo(indicadores.periodo.desde)} al ${fechaArchivo(indicadores.periodo.hasta)}`;
