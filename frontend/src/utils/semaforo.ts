import type { EstadoSemaforo } from "../components/ui/form/data-display/estadoSemaforo";

// Mismo umbral que usan equipos, personal, documentos y la vista consolidada
// de vencimientos. Recambios tiene su propio umbral y llega ya calculado desde
// el backend, así que no pasa por acá.
export const DIAS_AVISO_PROXIMO = 15;

export interface SemaforoCalculado {
  estado: EstadoSemaforo;
  diasRestantes: number;
}

const parsearFecha = (fecha: string): Date => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
};

/** Suma días a una fecha "YYYY-MM-DD" sin pasar por UTC. */
export const sumarDias = (fecha: string, dias: number): string => {
  const resultado = parsearFecha(fecha);
  resultado.setDate(resultado.getDate() + dias);

  return [
    resultado.getFullYear(),
    String(resultado.getMonth() + 1).padStart(2, "0"),
    String(resultado.getDate()).padStart(2, "0"),
  ].join("-");
};

/** Calcula el estado del semáforo para una fecha "YYYY-MM-DD". */
export const calcularSemaforo = (
  fecha: string,
  diasAviso = DIAS_AVISO_PROXIMO,
): SemaforoCalculado => {
  const vencimiento = parsearFecha(fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diasRestantes = Math.round(
    (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasRestantes < 0) {
    return { estado: "vencido", diasRestantes };
  }

  if (diasRestantes <= diasAviso) {
    return { estado: "proximo", diasRestantes };
  }

  return { estado: "vigente", diasRestantes };
};
