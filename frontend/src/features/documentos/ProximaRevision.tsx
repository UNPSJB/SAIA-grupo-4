import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { formatearFecha } from "./utils";

// Cálculo en cliente porque el backend no expone alertas de revisión de documentos
// (a diferencia de recambios, que sí tiene GET /recambios/alertas).
const DIAS_AVISO_PROXIMO = 15;

interface EstiloEstado {
    color: string;      // colorPalette de Chakra para el punto (ej. "red", "yellow", "green")
    leyenda?: string;   // texto opcional debajo de la fecha, ej. "(Vencido)"
}

const estiloPorFecha = (fecha: string): EstiloEstado => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaRevision = new Date(`${fecha}T00:00:00`);
    const diasRestantes = Math.round(
        (fechaRevision.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasRestantes < 0) return { color: "red", leyenda: "(Vencido)" };
    if (diasRestantes === 0) return { color: "yellow", leyenda: "(Hoy)" };
    if (diasRestantes <= DIAS_AVISO_PROXIMO)
        return { color: "yellow", leyenda: `(En ${diasRestantes} día${diasRestantes > 1 ? "s" : ""})` };
    return { color: "green" };
};

interface ProximaRevisionProps {
    fecha?: string | null;
}

// Columna "Próxima Revisión" del listado de documentos.
// Sin fecha (documento sin versión vigente o sin revisión programada) se muestra "—".
// Réplica del estilo de ProximoRecambio (recambios) con umbral propio de 15 días.
export const ProximaRevision = ({ fecha }: ProximaRevisionProps) => {
    if (!fecha) return <>—</>;

    const { color, leyenda } = estiloPorFecha(fecha);

    return (
        <VStack gap={0} align="start">
            <HStack gap={2}>
                <Box w={3} h={3} borderRadius="full" bg={`${color}.500`} flexShrink={0} />
                <Text>{formatearFecha(fecha)}</Text>
            </HStack>
            {leyenda && <Text fontSize="sm" fontStyle="italic" color="gray.500">{leyenda}</Text>}
        </VStack>
    );
};
