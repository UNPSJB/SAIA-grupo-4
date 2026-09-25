import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Image,
  Separator,
} from "@chakra-ui/react";
import {
  FiCheckCircle,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiDroplet,
  FiLock,
  FiImage,
  FiFileText,
} from "react-icons/fi";
import type { TareaChecklist } from "../types";

interface TareaCardCompletadaProps {
  tarea: TareaChecklist;
}

export function TareaCardCompletada({ tarea }: TareaCardCompletadaProps) {
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
      boxSizing="border-box"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
        <HStack gap={2}>
          <Badge colorScheme="green" bg="green.600" color="white" px={2} py={0.5} borderRadius="md" fontSize="xs">
            <HStack gap={1}>
              <FiCheckCircle size={12} />
              <Text textTransform="uppercase" fontWeight="bold">
                COMPLETADA
              </Text>
            </HStack>
          </Badge>
          <Text color="gray.400" fontSize="xs">|</Text>
          <Badge colorScheme="blue" variant="outline" px={2} py={0.5} borderRadius="md" textTransform="uppercase" fontSize="2xs">
            {tarea.tipo}
          </Badge>
        </HStack>
        <HStack color="green.700" fontSize="2xs" fontWeight="semibold">
          <FiLock size={11} />
          <Text>Registro inmutable</Text>
        </HStack>
      </Flex>

      <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color="gray.800" mb={1} wordBreak="break-word">
        {tarea.nombre}
      </Text>
      <HStack color="gray.600" fontSize="xs" mb={3} gap={1.5} align="flex-start">
        <Box pt="2px"><FiMapPin size={13} color="#718096" /></Box>
        <Text wordBreak="break-word">
          Destino: <strong>{tarea.destino}</strong>
        </Text>
      </HStack>

      {auditoria && (
        <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="green.100">
          <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
            <VStack align="stretch" gap={1.5} fontSize="xs" color="gray.700" flex="1" minW="200px">
              <HStack gap={1.5}>
                <FiClock color="#38A169" />
                <Text>
                  Realizado por: <strong>{auditoria.realizadoPor}</strong> a las <strong>{auditoria.hora}</strong>
                </Text>
              </HStack>

              <HStack gap={1.5}>
                <FiCalendar color="#38A169" />
                <Text>Fecha: <strong>{auditoria.fecha}</strong></Text>
              </HStack>

              {auditoria.consumoRegistrado && auditoria.consumoRegistrado.length > 0 && (
                <HStack gap={1.5} align="flex-start">
                  <Box pt="2px"><FiDroplet color="#38A169" /></Box>
                  <Text wordBreak="break-word">
                    Consumo: <strong>{auditoria.consumoRegistrado.join(", ")}</strong>
                  </Text>
                </HStack>
              )}

              {/* Preview de la observación si fue ingresada */}
              {(auditoria as any)?.observacion && (auditoria as any).observacion !== "Sin observaciones" && (
                <HStack gap={1.5} align="flex-start">
                  <Box pt="2px"><FiFileText color="#38A169" /></Box>
                  <Text wordBreak="break-word">
                    Observación: <em>"{(auditoria as any).observacion}"</em>
                  </Text>
                </HStack>
              )}
                
              {auditoria.fotoNombre && (
                <HStack gap={1.5}>
                  <FiImage color="#38A169" />
                  <Text fontSize="2xs" color="gray.500">{auditoria.fotoNombre}</Text>
                </HStack>
              )}
            </VStack>

            {auditoria.fotoUrl && (
              <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.200" maxW="90px">
                <Image src={auditoria.fotoUrl} alt="Evidencia" objectFit="cover" boxSize="80px" />
              </Box>
            )}
          </Flex>
        </Box>
      )}
    </Box>
  );
}