import { SemaforoFecha } from "../../components/ui";
import { calcularSemaforo } from "../../utils/semaforo";

interface ProximaRevisionProps {
  fecha?: string | null;
}

// Columna "Próxima Revisión" del listado de documentos.
// Sin fecha (documento inactivo, sin versión vigente o sin revisión programada)
// se muestra "No tiene" en gris.
// Usa el mismo semáforo compartido que equipos, personal y vencimientos.
export const ProximaRevision = ({ fecha }: ProximaRevisionProps) => {
  if (!fecha) return <span style={{ color: "gray" }}>No tiene</span>;

  const { estado, diasRestantes } = calcularSemaforo(fecha);

  return (
    <SemaforoFecha
      estado={estado}
      fecha={fecha}
      diasRestantes={diasRestantes}
    />
  );
};
