import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
} from "react-icons/fi";
import type { CompletitudCAA } from "../types";

interface IndicadorCompletitudCAAProps {
  completitud: CompletitudCAA;
}

export const IndicadorCompletitudCAA = ({
  completitud,
}: IndicadorCompletitudCAAProps) => {
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const color = completitud.esta_completo
    ? "green"
    : completitud.porcentaje >= 60
      ? "blue"
      : "orange";

  return (
    <Card.Root
      variant="outline"
      bg="white"
      shadow="xs"
      borderColor={completitud.esta_completo ? "green.200" : "gray.200"}
    >
      <Card.Body p={4}>
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack gap={2.5} align="center" flexWrap="wrap">
              <Icon
                as={FiClipboard}
                boxSize={5}
                color={`${color}.600`}
              />
              <Text fontWeight="bold" fontSize="md" color="gray.800">
                Completitud Normativa CAA (Cap. V)
              </Text>
              <Badge colorPalette={color} variant="subtle" size="md">
                {completitud.porcentaje}% ({completitud.total_completados}/
                {completitud.total_obligatorios})
              </Badge>
              {completitud.esta_completo ? (
                <Badge colorPalette="green" variant="solid" size="sm">
                  Rótulo completo
                </Badge>
              ) : (
                <Badge colorPalette="orange" variant="subtle" size="sm">
                  Borrador incompleto ({completitud.campos_faltantes.length} pendientes)
                </Badge>
              )}
            </HStack>

            <Button
              type="button"
              size="xs"
              variant="ghost"
              colorPalette="gray"
              onClick={() => setMostrarDetalle((prev) => !prev)}
            >
              {mostrarDetalle ? <FiChevronUp /> : <FiChevronDown />}
              {mostrarDetalle
                ? "Ocultar checklist de requisitos"
                : "Ver checklist de requisitos CAA"}
            </Button>
          </HStack>

          {/* Barra de progreso */}
          <Box
            w="full"
            h="10px"
            bg="gray.100"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="full"
              w={`${completitud.porcentaje}%`}
              bg={`${color}.500`}
              transition="width 0.25s ease"
            />
          </Box>

          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text fontSize="xs" color="gray.600">
              {completitud.esta_completo
                ? "Todos los requisitos obligatorios del Cap. V del CAA están completos."
                : `Faltan completar: ${completitud.campos_faltantes.join(", ")}.`}
            </Text>
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              Podés guardar el borrador en cualquier momento aunque falten campos.
            </Text>
          </HStack>

          {mostrarDetalle && (
            <Box
              p={3}
              bg="gray.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={2}>
                {completitud.detalle.map((item) => (
                  <HStack
                    key={item.clave}
                    align="center"
                    gap={2}
                    p={2}
                    bg="white"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={item.completado ? "green.200" : "orange.200"}
                  >
                    <Icon
                      as={item.completado ? FiCheckCircle : FiAlertCircle}
                      color={item.completado ? "green.600" : "orange.500"}
                      flexShrink={0}
                    />
                    <VStack align="start" gap={0} flex={1}>
                      <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                        {item.etiqueta}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {item.seccion}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </SimpleGrid>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};
