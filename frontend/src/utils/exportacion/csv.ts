import type { TablaExportable } from "./tipos";

const BOM = "﻿";
// Excel en español usa ";" como separador de lista (la coma es decimal).
const SEPARADOR = ";";
const FIN_DE_LINEA = "\r\n";

// Excel interpreta como fórmula lo que empieza con estos caracteres.
const INICIO_FORMULA = /^[=+\-@\t\r]/;
// Números como "-5" o "-3,5" y teléfonos "+54 11 ..." son datos legítimos.
const NUMERO = /^-?\d+(,\d+)?$/;
const TELEFONO = /^\+\d[\d\s().-]*$/;

/** Neutraliza posibles fórmulas anteponiendo un apóstrofo. */
export const protegerFormula = (texto: string): string =>
  INICIO_FORMULA.test(texto) && !NUMERO.test(texto) && !TELEFONO.test(texto)
    ? `'${texto}`
    : texto;

const escaparCelda = (texto: string): string =>
  `"${protegerFormula(texto).replace(/"/g, '""')}"`;

export const generarCsv = ({ encabezados, filas }: TablaExportable): Blob => {
  const lineas = [encabezados, ...filas].map((fila) =>
    fila.map(escaparCelda).join(SEPARADOR),
  );
  return new Blob([BOM, lineas.join(FIN_DE_LINEA)], {
    type: "text/csv;charset=utf-8",
  });
};
