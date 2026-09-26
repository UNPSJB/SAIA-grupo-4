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
import type { TareaHistorialItem } from "../types";

interface TareaCardIncumplidaProps {
  tarea: TareaHistorialItem;
}

export function TareaCardIncumplida({ tarea }: TareaCardIncumplidaProps) {
  const [guiaAbierta, setGuiaAbierta] = useState(false);

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
                NO COMPLETADA
              </Text>
            </HStack>
          </Badge>
          <Text color="gray.400" fontSize="xs">|</Text>
          <Badge colorPalette="gray" variant="outline" px={2} py={0.5} borderRadius="md" textTransform="uppercase" fontSize="2xs">
            {tarea.tipo}
          </Badge>
        </HStack>
        <HStack color="red.700" fontSize="2xs" fontWeight="semibold">
          <FiCalendar size={12} />
          <Text>Fecha de ejecución: {tarea.fechaProgramada}</Text>
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
            <Text>Destino: <strong>{tarea.destino}</strong></Text>
          </HStack>

          {tarea.elementosLimpieza && tarea.elementosLimpieza.length > 0 && (
            <HStack color="gray.700" gap={1.5} align="flex-start">
              <Box pt="2px"><FiTool size={13} color="#718096" /></Box>
              <Text>
                Elementos requeridos: <strong>{tarea.elementosLimpieza.join(", ")}</strong>
              </Text>
            </HStack>
          )}

          {/* Guía POES paso a paso */}
          {tarea.procedimiento && tarea.procedimiento.length > 0 && (
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
                      {tarea.procedimiento.map((paso, idx) => (
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
        * Tarea finalizada automáticamente por el sistema al final de la jornada al no registrarse su ejecución.
      </Text>
    </Box>
  );
}