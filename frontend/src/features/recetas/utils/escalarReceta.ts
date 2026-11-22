/**
 * Utilidades para escalar proporcionalmente las cantidades de insumos de una receta
 * usando la misma lógica y redondeo a 2 decimales que el registro de lote.
 */
export const calcularFactorEscala = (
  cantidadObjetivo: string,
  rendimientoEstandar: number,
): number => {
  const cantNum = parseFloat(cantidadObjetivo);
  if (
    isNaN(cantNum) ||
    cantNum <= 0 ||
    isNaN(rendimientoEstandar) ||
    rendimientoEstandar <= 0
  ) {
    return 1.0;
  }
  return cantNum / rendimientoEstandar;
};

export const escalarCantidadReceta = (
  valorNominal: number,
  factorEscala: number,
): number => {
  return Math.round(valorNominal * factorEscala * 100) / 100;
};

export const formatearCantidadEscalada = (
  valorNominal: number,
  factorEscala: number,
): string => {
  return escalarCantidadReceta(valorNominal, factorEscala).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  });
};
