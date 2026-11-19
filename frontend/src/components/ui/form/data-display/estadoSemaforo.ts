/**
 * Estado semantico de un vencimiento, independiente del modulo que lo produce.
 *
 * Hace falta porque cada dominio nombra sus estados distinto: recambios usa
 * "al_dia" y vencimientos usa "vigente" para lo mismo. Quien consuma el
 * componente traduce el nombre; este modulo no conoce ningun enum de backend.
 *
 * Va en archivo aparte del componente porque `react-refresh` exige que un
 * archivo de componente exporte unicamente componentes.
 */
export type EstadoSemaforo = "vencido" | "proximo" | "vigente";

export const COLOR_ESTADO: Record<EstadoSemaforo, string> = {
  vencido: "red",
  proximo: "yellow",
  vigente: "green",
};

export const ETIQUETA_ESTADO: Record<EstadoSemaforo, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  vigente: "Vigente",
};

/** Textos de la leyenda, un poco más descriptivos que las etiquetas de estado. */
export const LEYENDA_ESTADO: Record<EstadoSemaforo, string> = {
  vencido: "Vencido",
  proximo: "Próximo a vencer",
  vigente: "Vigente",
};

/**
 * Leyenda secundaria del semáforo. Sin leyenda para "vigente" porque ahí no
 * aporta nada: la ausencia de cuenta regresiva ya es la señal de que no urge.
 */
export const leyendaDe = (
  estado: EstadoSemaforo,
  diasRestantes: number,
): string | undefined => {
  switch (estado) {
    case "vencido":
      return "(Vencido)";
    case "proximo":
      return diasRestantes === 0 ? "(Hoy)" : `(En ${diasRestantes} días)`;
    case "vigente":
      return undefined;
  }
};
/**
 * Versión en texto plano de <SemaforoFecha> para exportar a CSV/PDF:
 * "20/11/2026 - Próximo a vencer (en 11 días)".
 */
export const textoSemaforo = (
  fechaTexto: string,
  estado: EstadoSemaforo,
  diasRestantes: number,
): string => {
  const detalle =
    estado === "proximo"
      ? diasRestantes === 0
        ? " (hoy)"
        : ` (en ${diasRestantes} días)`
      : "";
  return `${fechaTexto} - ${LEYENDA_ESTADO[estado]}${detalle}`;
};
