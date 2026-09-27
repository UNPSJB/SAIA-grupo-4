import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import type { AlertaRecambio, EstadoRecambio } from "./types";

// "2026-10-02" -> "02/10/2026" sin pasar por new Date():
// new Date("2026-10-02") se interpreta en UTC y en Argentina mostraría el día anterior
const formatearFechaISO = (fecha: string) => {
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
};

interface EstiloEstado {
    color: string;      // colorPalette de Chakra para el punto (ej. "red", "yellow", "green")
    leyenda?: string;   // texto opcional debajo de la fecha, ej. "(Vencido)"
}

const estiloPorEstado = (estado: EstadoRecambio, diasRestantes: number): EstiloEstado => {
    switch (estado) {
        case "vencido":
            return { color: "red", leyenda: "(Vencido)" };
        case "proximo":
            return { color: "yellow", leyenda: diasRestantes === 0 ? "(Hoy)" : `(En ${diasRestantes} días)` };
        case "al_dia":
            return { color: "green" };
    }
};

interface ProximoRecambioProps {
    alerta?: AlertaRecambio;
}

// Columna "Próximo Recambio" del listado de elementos de limpieza.
// Sin alerta (elemento inactivo o sin frecuencia configurada) se muestra "—".
export const ProximoRecambio = ({ alerta }: ProximoRecambioProps) => {
    if (!alerta) return <>—</>;

    const { color, leyenda } = estiloPorEstado(alerta.estado, alerta.dias_restantes);

    return (
        <VStack gap={0} align="start">
            <HStack gap={2}>
                <Box w={3} h={3} borderRadius="full" bg={`${color}.500`} flexShrink={0} />
                <Text>{formatearFechaISO(alerta.proxima_fecha)}</Text>
            </HStack>
            {leyenda && <Text fontSize="sm" fontStyle="italic" color="gray.500">{leyenda}</Text>}
        </VStack>
    );
};
