import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiOctagon } from "react-icons/fi";
import { AlertMessage } from "../../../components/ui";
import { formatearFechaISO } from "../../../utils/fecha";
import type { SellosAdvertenciaOut } from "../types";
import { MemoriaCalculoSellos } from "./MemoriaCalculoSellos";
import { LeyendaRectangular, OctogonoReglamentario } from "./SellosGraficos";

interface CalculadoraOctogonosProps {
  sellosData: SellosAdvertenciaOut;
}

export const CalculadoraOctogonos = ({
  sellosData,
}: CalculadoraOctogonosProps) => {
  if (!sellosData.aplica_evaluacion_sellos) {
    return null;
  }

  const totalAdvertencias =
    sellosData.sellos.length + sellosData.leyendas_precautorias.length;

  return (
    <Card.Root variant='outline' bg='white' shadow='xs' overflow='hidden'>
      <Card.Header pb={3}>
        <HStack justify='space-between' align='center' flexWrap='wrap' gap={3}>
          <HStack gap={2.5}>
            <Icon as={FiOctagon} boxSize={5} color='gray.900' />
            <VStack align='start' gap={0}>
              <Heading size='md' color='gray.800'>
                Sellos de Advertencia y Leyendas Precautorias
              </Heading>
              <Text fontSize='sm' color='gray.500'>
                Base de cálculo: {sellosData.base_calculo} (
                {sellosData.es_liquido ? "Líquido" : "Sólido"})
                {sellosData.valor_energetico_100 != null &&
                  ` • Energía total: ${sellosData.valor_energetico_100.toLocaleString("es-AR")} kcal / ${sellosData.base_calculo}`}
              </Text>
            </VStack>
          </HStack>

          <HStack gap={2} flexWrap='wrap'>
            {!sellosData.es_calculable && (
              <Badge colorPalette='orange' variant='subtle' size='sm'>
                Cálculo pendiente
              </Badge>
            )}
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0} gap={4}>
        {!sellosData.es_calculable ? (
          <AlertMessage
            type='warning'
            message={
              sellosData.mensaje_bloqueo ||
              "Completá los datos nutricionales y equivalencias de los insumos para calcular los sellos."
            }
          />
        ) : (
          <>
            {totalAdvertencias === 0 ? (
              <AlertMessage
                type='success'
                message='El producto fue evaluado y no supera ninguno de los umbrales críticos (no corresponde declarar sellos ni leyendas precautorias).'
              />
            ) : (
              <VStack
                align='stretch'
                gap={4}
                p={4}
                bg='gray.50'
                borderWidth='1px'
                borderColor='gray.200'
                borderRadius='md'
              >
                {sellosData.sellos.length > 0 && (
                  <Box>
                    <Text
                      fontSize='xs'
                      fontWeight='bold'
                      color='gray.600'
                      textTransform='uppercase'
                      mb={3}
                    >
                      Octógonos de advertencia en cara principal
                    </Text>
                    <Flex gap={4} flexWrap='wrap' align='center'>
                      {sellosData.sellos.map((sello) => (
                        <OctogonoReglamentario
                          key={sello.codigo}
                          codigo={sello.codigo}
                          texto={sello.texto}
                        />
                      ))}
                    </Flex>
                  </Box>
                )}

                {sellosData.leyendas_precautorias.length > 0 && (
                  <Box>
                    <Text
                      fontSize='xs'
                      fontWeight='bold'
                      color='gray.600'
                      textTransform='uppercase'
                      mb={2.5}
                    >
                      Leyendas precautorias
                    </Text>
                    <Flex gap={3} flexWrap='wrap' align='center'>
                      {sellosData.leyendas_precautorias.map((leyenda) => (
                        <LeyendaRectangular
                          key={leyenda.codigo}
                          codigo={leyenda.codigo}
                          texto={leyenda.texto}
                        />
                      ))}
                    </Flex>
                  </Box>
                )}
              </VStack>
            )}

            <MemoriaCalculoSellos pasos={sellosData.memoria_calculo} />
          </>
        )}

        <HStack gap={2} flexWrap='wrap' align='center'>
          <Text fontSize='xs' color='gray.500'>
            Parámetros de cálculo: {sellosData.version_normativa} (Vigente desde:{" "}
            {formatearFechaISO(sellosData.fecha_vigencia_normativa)})
          </Text>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
};
