import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Collapsible,
} from "@chakra-ui/react";
import {
  FiXCircle,
  FiMapPin,
  FiTool,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
} from "react-icons/fi";
import type { EjecucionTarea } from "../../checklists/types";
import {
  etiquetaTipoPoe,
  formatearFecha,
  obtenerDestino,
  obtenerPasosPoes,
} from "../../checklists/utils";

interface TareaCardIncumplidaProps {
  ejecucion: EjecucionTarea;
}

export function TareaCardIncumplida({ ejecucion }: TareaCardIncumplidaProps) {
  const [guiaAbierta, setGuiaAbierta] = useState(false);

  const { tarea } = ejecucion;
  const pasosPoes = obtenerPasosPoes(tarea.metodo);
  const elementos = tarea.elementos_limpieza.map(
    (e) => `${e.cantidad_requerida} ${e.elemento_limpieza.nombre}`,
  );

  return (
    <Box
      bg="red.50"
      p={{ base: 4, md: 5 }}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="red.200"
      borderLeft="4px solid"
      borderLeftColor="red.500"
      w="100%"
    >
      {/* Cabecera de estado */}
      <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
        <HStack gap={2}>
          <Badge colorPalette="red" bg="red.600" color="white" px={2} py={0.5} borderRadius="md" fontSize="xs">
            <HStack gap={1}>
              <FiXCircle size={12} />
              <Text textTransform="uppercase" fontWeight="bold">
                NO REALIZADA
              </Text>
            </HStack>
          </Badge>
          <Text color="gray.400" fontSize="xs">|</Text>
          <Badge colorPalette="gray" variant="outline" px={2} py={0.5} borderRadius="md" fontSize="2xs">
            {etiquetaTipoPoe(tarea.tipo_poes)}
          </Badge>
        </HStack>
        <HStack color="red.700" fontSize="2xs" fontWeight="semibold">
          <FiCalendar size={12} />
          <Text>Fecha programada: {formatearFecha(ejecucion.fecha_programada)}</Text>
        </HStack>
      </Flex>

      {/* Nombre */}
      <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color="gray.800" mb={3}>
        {tarea.nombre}
      </Text>

      {/* Bloque solicitado por Nico: Procedimiento y Elementos que se debían usar */}
      <Box bg="white" p={3.5} borderRadius="lg" border="1px solid" borderColor="red.100" mb={2}>
        <VStack align="stretch" gap={2} fontSize="xs">
          <HStack color="gray.700" gap={1.5} align="flex-start">
            <Box pt="2px"><FiMapPin size={13} color="#718096" /></Box>
            <Text>Destino: <strong>{obtenerDestino(tarea)}</strong></Text>
          </HStack>

          {elementos.length > 0 && (
            <HStack color="gray.700" gap={1.5} align="flex-start">
              <Box pt="2px"><FiTool size={13} color="#718096" /></Box>
              <Text>
                Elementos requeridos: <strong>{elementos.join(", ")}</strong>
              </Text>
            </HStack>
          )}

          {/* Guía POES paso a paso */}
          {pasosPoes.length > 0 && (
            <Box pt={1}>
              <Button
                variant="ghost"
                size="xs"
                p={0}
                h="auto"
                color="blue.600"
                _hover={{ bg: "transparent", textDecoration: "underline" }}
                onClick={() => setGuiaAbierta(!guiaAbierta)}
              >
                <HStack gap={1}>
                  <Text fontWeight="semibold">Ver Guía Paso a Paso (Instrucciones POES)</Text>
                  {guiaAbierta ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                </HStack>
              </Button>

              <Collapsible.Root open={guiaAbierta}>
                <Collapsible.Content>
                  <Box mt={2} pl={3} borderLeft="2px solid" borderColor="blue.200" bg="blue.50" p={2} borderRadius="md">
                    <VStack align="stretch" gap={1} fontSize="2xs" color="gray.700">
                      {pasosPoes.map((paso, idx) => (
                        <Text key={idx}>{idx + 1}. {paso}</Text>
                      ))}
                    </VStack>
                  </Box>
                </Collapsible.Content>
              </Collapsible.Root>
            </Box>
          )}
        </VStack>
      </Box>

      <Text fontSize="2xs" color="red.600" fontStyle="italic">
        * Tarea marcada automáticamente como no realizada al vencer su fecha programada sin ejecución registrada.
      </Text>
    </Box>
  );
}
