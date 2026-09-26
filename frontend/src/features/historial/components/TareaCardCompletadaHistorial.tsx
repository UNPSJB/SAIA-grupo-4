import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Image,
  Button,
  Collapsible,
} from "@chakra-ui/react";
import {
  FiCheckCircle,
  FiClock,
  FiUser,
  FiCalendar,
  FiDroplet,
  FiFileText,
  FiImage,
  FiLock,
  FiMapPin,
  FiTool,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import type { TareaHistorialItem } from "../types";

interface TareaCardCompletadaHistorialProps {
  tarea: TareaHistorialItem;
}

export function TareaCardCompletadaHistorial({ tarea }: TareaCardCompletadaHistorialProps) {
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const { auditoria } = tarea;

  return (
    <Box
      bg="green.50"
      p={{ base: 4, md: 5 }}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="green.200"
      borderLeft="4px solid"
      borderLeftColor="green.500"
      w="100%"
    >
      {/* Encabezado: Estado + Inmutable */}
      <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
        <HStack gap={2}>
          <Badge colorPalette="green" bg="green.600" color="white" px={2} py={0.5} borderRadius="md" fontSize="xs">
            <HStack gap={1}>
              <FiCheckCircle size={12} />
              <Text textTransform="uppercase" fontWeight="bold">
                COMPLETADA
              </Text>
            </HStack>
          </Badge>
          <Text color="gray.400" fontSize="xs">|</Text>
          <Badge colorPalette="gray" variant="outline" px={2} py={0.5} borderRadius="md" textTransform="uppercase" fontSize="2xs">
            {tarea.tipo}
          </Badge>
        </HStack>

        <HStack color="green.700" fontSize="2xs" fontWeight="semibold">
          <FiLock size={12} />
          <Text>Registro inmutable</Text>
        </HStack>
      </Flex>

      {/* Nombre de la tarea */}
      <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color="gray.800" mb={2}>
        {tarea.nombre}
      </Text>

      {/* Bloque superior requerido por Nico: Destino, Elementos y Guía POES */}
      <Box bg="white" p={3.5} borderRadius="lg" border="1px solid" borderColor="green.100" mb={3}>
        <VStack align="stretch" gap={2} fontSize="xs">
          <HStack color="gray.700" gap={1.5} align="flex-start">
            <Box pt="2px"><FiMapPin size={13} color="#718096" /></Box>
            <Text>Destino: <strong>{tarea.destino}</strong></Text>
          </HStack>

          {tarea.elementosLimpieza && tarea.elementosLimpieza.length > 0 && (
            <HStack color="gray.700" gap={1.5} align="flex-start">
              <Box pt="2px"><FiTool size={13} color="#718096" /></Box>
              <Text>
                Usar: <strong>{tarea.elementosLimpieza.join(", ")}</strong>
              </Text>
            </HStack>
          )}

          {/* Guía POES paso a paso desplegable */}
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

      {/* Bloque inferior: Registro de Auditoría (Ejecución real) */}
      {auditoria && (
        <Box bg="white" p={3.5} borderRadius="lg" border="1px solid" borderColor="green.100">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3}>
            <VStack align="stretch" gap={1.5} fontSize="xs" color="gray.700" flex={1}>
              {auditoria.realizadoPor && (
                <HStack gap={1.5}>
                  <FiUser color="#38A169" />
                  <Text>
                    Realizado por: <strong>{auditoria.realizadoPor}</strong>
                    {auditoria.hora && (
                      <Text as="span" color="gray.500" ml={1}>
                        <FiClock style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
                        a las {auditoria.hora}
                      </Text>
                    )}
                  </Text>
                </HStack>
              )}

              <HStack gap={1.5}>
                <FiCalendar color="#718096" />
                <Text>Fecha: <strong>{auditoria.fecha}</strong></Text>
              </HStack>

              {auditoria.consumoRegistrado && auditoria.consumoRegistrado.length > 0 && (
                <HStack gap={1.5} align="flex-start">
                  <Box pt="2px"><FiDroplet color="#38A169" /></Box>
                  <Text>
                    Consumo: <strong>{auditoria.consumoRegistrado.join(", ")}</strong>
                  </Text>
                </HStack>
              )}

              {auditoria.observacion && (
                <HStack gap={1.5} align="flex-start">
                  <Box pt="2px"><FiFileText color="#718096" /></Box>
                  <Text color="gray.600">
                    Observación: <em>"{auditoria.observacion}"</em>
                  </Text>
                </HStack>
              )}

              {auditoria.fotoNombre && (
                <HStack gap={1.5} color="gray.500" fontSize="2xs">
                  <FiImage />
                  <Text>{auditoria.fotoNombre}</Text>
                </HStack>
              )}
            </VStack>

            {/* Foto de evidencia */}
            {auditoria.fotoUrl && (
              <Box flexShrink={0} borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.200" maxW={{ base: "100%", md: "110px" }}>
                <Image
                  src={auditoria.fotoUrl}
                  alt="Evidencia fotográfica"
                  objectFit="cover"
                  w="110px"
                  h="80px"
                />
              </Box>
            )}
          </Flex>
        </Box>
      )}
    </Box>
  );
}