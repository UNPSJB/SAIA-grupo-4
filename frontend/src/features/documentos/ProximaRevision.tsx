import { SemaforoFecha } from "../../components/ui";
import { calcularSemaforo } from "../../utils/semaforo";

interface ProximaRevisionProps {
  fecha?: string | null;
}

// Columna "Próxima Revisión" del listado de documentos.
// Sin fecha (documento sin versión vigente o sin revisión programada) se muestra "—".
// Usa el mismo semáforo compartido que equipos, personal y vencimientos.
export const ProximaRevision = ({ fecha }: ProximaRevisionProps) => {
  if (!fecha) return <>—</>;

  const { estado, diasRestantes } = calcularSemaforo(fecha);

  return (
    <SemaforoFecha
      estado={estado}
      fecha={fecha}
      diasRestantes={diasRestantes}
    />
  );
};
