import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { getChartColor } from "./utils/chartColors";

// Datos para cada segmento de la barra
interface SegmentoBarra {
  label: string;
  valor: number;
}

// Props de la barra segmentada
interface SegmentedBarProps {
  segmentos: SegmentoBarra[];
  mostrarLeyenda?: boolean;
}

// Barra segmentada apilada para mostrar distribución por estado
// Más legible que gráfico de torta para comparar proporciones
export function SegmentedBar({
  segmentos,
  mostrarLeyenda = true,
}: SegmentedBarProps) {
  if (!segmentos || segmentos.length === 0) {
    return (
      <VStack align='stretch' gap={2}>
        <Box h='12px' bg='gray.200' borderRadius='full' />
        <Text fontSize='xs' color='gray.500' textAlign='center'>
          Sin datos
        </Text>
      </VStack>
    );
  }

  // Calcula total para obtener porcentajes
  const total = segmentos.reduce((sum, seg) => sum + seg.valor, 0);

  if (total === 0) {
    return (
      <VStack align='stretch' gap={2}>
        <Box h='12px' bg='gray.200' borderRadius='full' />
        <Text fontSize='xs' color='gray.500' textAlign='center'>
          Sin datos
        </Text>
      </VStack>
    );
  }

  return (
    <VStack align='stretch' gap={3}>
      {/* Barra segmentada apilada */}
      <Flex
        h='12px'
        borderRadius='full'
        overflow='hidden'
        bg='gray.100'
        w='full'
      >
        {segmentos.map((segmento, index) => {
          const porcentaje = (segmento.valor / total) * 100;
          const color = getChartColor(segmento.label, index);

          if (porcentaje === 0) return null;

          return (
            <Box
              key={index}
              h='full'
              bg={color}
              w={`${porcentaje}%`}
              title={`${segmento.label}: ${segmento.valor} (${porcentaje.toFixed(1)}%)`}
            />
          );
        })}
      </Flex>

      {/* Leyenda con valores y porcentajes */}
      {mostrarLeyenda && (
        <VStack align='stretch' gap={2}>
          {segmentos.map((segmento, index) => {
            const porcentaje = (segmento.valor / total) * 100;
            const color = getChartColor(segmento.label, index);

            return (
              <Flex key={index} align='center' justify='space-between'>
                <Flex align='center' gap={2}>
                  <Box
                    w={3}
                    h={3}
                    borderRadius='full'
                    bg={color}
                    flexShrink={0}
                  />
                  <Text fontSize='xs' color='gray.600'>
                    {segmento.label}
                  </Text>
                </Flex>
                <Text fontSize='xs' fontWeight='medium' color='gray.700'>
                  {segmento.valor} ({porcentaje.toFixed(1)}%)
                </Text>
              </Flex>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}
