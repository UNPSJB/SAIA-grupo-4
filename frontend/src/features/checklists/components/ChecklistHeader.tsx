import { Box, Flex, Heading, Text, Badge, HStack, Progress } from "@chakra-ui/react";
import { FiCheckSquare, FiUser, FiCalendar } from "react-icons/fi";
import type { OperarioInfo } from "../types";

interface ChecklistHeaderProps {
  operario: OperarioInfo;
  fechaStr: string;
  totalTareas: number;
  completadas: number;
}

export function ChecklistHeader({
  operario,
  fechaStr,
  totalTareas,
  completadas,
}: ChecklistHeaderProps) {
  const porcentaje = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

  return (
    <Box
      bg="white"
      p={5}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
      mb={6}
    >
      <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} gap={4}>
        <Box>
          <HStack gap={2} mb={1}>
            <FiCheckSquare color="#2F855A" size={22} />
            <Heading size="md" color="gray.800">
              Checklist de Limpieza del Día
            </Heading>
          </HStack>
          <HStack gap={2} color="gray.600" fontSize="sm">
            <FiUser />
            <Text>
              Operario: <strong>{operario.nombre}</strong>
            </Text>
            <Badge colorScheme="green" variant="subtle" fontSize="xs" px={2} borderRadius="full">
              {operario.capacidad}
            </Badge>
          </HStack>
        </Box>

        <Box minW={{ base: "100%", md: "260px" }}>
          <Flex justify="space-between" align="center" mb={1} fontSize="xs" color="gray.600">
            <HStack gap={1}>
              <FiCalendar />
              <Text>{fechaStr}</Text>
            </HStack>
            <Text fontWeight="bold" color="gray.700">
              Progreso: {completadas}/{totalTareas} ({porcentaje}%)
            </Text>
          </Flex>
          <Progress.Root value={porcentaje} colorPalette="green" size="sm">
            <Progress.Track bg="gray.100" borderRadius="full">
              <Progress.Range bg="green.600" borderRadius="full" />
            </Progress.Track>
          </Progress.Root>
        </Box>
      </Flex>
    </Box>
  );
}