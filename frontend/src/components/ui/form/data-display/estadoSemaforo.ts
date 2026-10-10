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