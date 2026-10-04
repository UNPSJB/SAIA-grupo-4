import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { formatearFecha } from "../../../../utils/fecha";
import {
  COLOR_ESTADO,
  leyendaDe,
  type EstadoSemaforo,
} from "./estadoSemaforo";

interface SemaforoFechaProps {
  estado: EstadoSemaforo;
  /** Fecha en formato "YYYY-MM-DD", tal como la devuelve el backend. */
  fecha: string;
  diasRestantes: number;
}

/**
 * Punto de color + fecha + leyenda de un vencimiento.
 *
 * Lo usan la vista consolidada de vencimientos y la columna "Próximo Recambio"
 * del listado de elementos de limpieza. El umbral de días que decide a qué
 * estado corresponde es del backend en ambos casos; acá solo se traduce a
 * color y texto.
 */
export const SemaforoFecha = ({
  estado,
  fecha,
  diasRestantes,
}: SemaforoFechaProps) => {
  const leyenda = leyendaDe(estado, diasRestantes);

  return (
    <VStack gap={0} align="start">
      <HStack gap={2}>
        <Box
          w={3}
          h={3}
          borderRadius="full"
          bg={`${COLOR_ESTADO[estado]}.500`}
          flexShrink={0}
        />
        <Text>{formatearFecha(fecha)}</Text>
      </HStack>
      {leyenda && (
        <Text fontSize="sm" fontStyle="italic" color="gray.500">
          {leyenda}
        </Text>
      )}
    </VStack>
  );
};