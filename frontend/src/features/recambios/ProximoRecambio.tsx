import { SemaforoFecha, TextoSinValor, type EstadoSemaforo } from "../../components/ui";
import type { AlertaRecambio, EstadoRecambio } from "./types";

// Traduce el enum de recambios al estado semantico del componente compartido.
// Los dos modulos nombran distinto el mismo concepto: recambios dice "al_dia"
// y vencimientos dice "vigente".
const ESTADO_COMPARTIDO: Record<EstadoRecambio, EstadoSemaforo> = {
  vencido: "vencido",
  proximo: "proximo",
  al_dia: "vigente",
};

// Columna "Próximo Recambio" del listado de elementos de limpieza.
// Sin alerta (elemento inactivo o sin frecuencia configurada) no hay fecha que
// calcular: se muestra "Sin calcular" en gris.
const SIN_CALCULAR = "Sin calcular";

export const ProximoRecambio = ({ alerta }: { alerta?: AlertaRecambio }) => {
  if (!alerta) return <TextoSinValor>{SIN_CALCULAR}</TextoSinValor>;

  return (
    <SemaforoFecha
      estado={ESTADO_COMPARTIDO[alerta.estado]}
      fecha={alerta.proxima_fecha}
      diasRestantes={alerta.dias_restantes}
    />
  );
};