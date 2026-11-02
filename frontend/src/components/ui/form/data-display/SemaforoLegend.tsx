import { Box, HStack, Text, Wrap } from "@chakra-ui/react";
import {
  COLOR_ESTADO,
  LEYENDA_ESTADO,
  type EstadoSemaforo,
} from "./estadoSemaforo";

const ORDEN_ESTADOS: EstadoSemaforo[] = ["vigente", "proximo", "vencido"];

interface SemaforoLegendProps {
  /** Separación superior respecto del contenido anterior. */
  mt?: number;
  /** Permite adaptar los textos a otros dominios sin cambiar los colores. */
  etiquetas?: Partial<Record<EstadoSemaforo, string>>;
  /** Texto accesible de la leyenda. */
  ariaLabel?: string;
}

/**
 * Leyenda compartida del semáforo de vencimientos.
 *
 * Se muestra debajo de las tablas que usan `SemaforoFecha` para que el color
 * del punto no dependa de conocer cada módulo en particular.
 */
export const SemaforoLegend = ({
  mt = 3,
  etiquetas,
  ariaLabel = "Leyenda del semáforo de vencimientos",
}: SemaforoLegendProps) => (
  <Wrap mt={mt} gap={4} role='note' aria-label={ariaLabel}>
    {ORDEN_ESTADOS.map((estado) => (
      <HStack key={estado} gap={2}>
        <Box
          w={3}
          h={3}
          borderRadius='full'
          bg={`${COLOR_ESTADO[estado]}.500`}
          flexShrink={0}
          aria-hidden='true'
        />
        <Text fontSize='sm' color='gray.600'>
          {etiquetas?.[estado] ?? LEYENDA_ESTADO[estado]}
        </Text>
      </HStack>
    ))}
  </Wrap>
);
