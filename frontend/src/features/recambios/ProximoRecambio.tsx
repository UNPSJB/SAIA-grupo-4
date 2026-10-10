import { SemaforoFecha, type EstadoSemaforo } from "../../components/ui";
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
// Sin alerta (elemento inactivo o sin frecuencia configurada) se muestra "—".
export const ProximoRecambio = ({ alerta }: { alerta?: AlertaRecambio }) => {
  if (!alerta) return <>"—"</>;

  return (
    <SemaforoFecha
      estado={ESTADO_COMPARTIDO[alerta.estado]}
      fecha={alerta.proxima_fecha}
      diasRestantes={alerta.dias_restantes}
    />
  );
};