import { Box, Flex, HStack, VStack, Text, Badge } from "@chakra-ui/react";
import { FiCheckCircle, FiAlertTriangle, FiList, FiTrendingUp } from "react-icons/fi";
import type { MetricasCumplimiento } from "../types";

interface HistorialMetricasProps {
  metricas: MetricasCumplimiento;
}

export function HistorialMetricas({ metricas }: HistorialMetricasProps) {
  const { totalTareas, completadas, incumplidas, porcentajeCumplimiento } = metricas;

  // Color de acento según la tasa de cumplimiento
  const esCumplimientoAlto = porcentajeCumplimiento >= 80;
  const colorScheme = esCumplimientoAlto ? "green" : porcentajeCumplimiento >= 50 ? "orange" : "red";
  const barBg = esCumplimientoAlto ? "#38A169" : porcentajeCumplimiento >= 50 ? "#DD6B20" : "#E53E3E";

  return (
    <Box
      bg="white"
      p={{ base: 4, md: 5 }}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
      mb={6}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        gap={4}
        mb={4}
      >
        {/* Tasa global de cumplimiento */}
        <HStack gap={3}>
          <Box
            p={3}
            borderRadius="lg"
            bg={esCumplimientoAlto ? "green.50" : "orange.50"}
            color={esCumplimientoAlto ? "green.600" : "orange.600"}
          >
            <FiTrendingUp size={24} />
          </Box>
          <VStack align="start" gap={0}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase">
              Cumplimiento del Período
            </Text>
            <HStack gap={2}>
              <Text fontSize="2xl" fontWeight="extrabold" color="gray.800">
                {porcentajeCumplimiento}%
              </Text>
              <Badge colorPalette={colorScheme} variant="subtle" fontSize="xs">
                {esCumplimientoAlto ? "Óptimo" : "Requiere Atención"}
              </Badge>
            </HStack>
          </VStack>
        </HStack>

        {/* Tarjetas resumen en miniatura */}
        <HStack gap={3} justify={{ base: "space-between", md: "flex-end" }} wrap="wrap">
          <Box p={3} borderRadius="lg" bg="gray.50" border="1px solid" borderColor="gray.100" minW="100px">
            <HStack gap={1.5} color="gray.500" mb={1}>
              <FiList size={13} />
              <Text fontSize="2xs" fontWeight="bold">TOTAL</Text>
            </HStack>
            <Text fontSize="lg" fontWeight="bold" color="gray.700">
              {totalTareas}
            </Text>
          </Box>

          <Box p={3} borderRadius="lg" bg="green.50" border="1px solid" borderColor="green.100" minW="100px">
            <HStack gap={1.5} color="green.600" mb={1}>
              <FiCheckCircle size={13} />
              <Text fontSize="2xs" fontWeight="bold">REALIZADAS</Text>
            </HStack>
            <Text fontSize="lg" fontWeight="bold" color="green.700">
              {completadas}
            </Text>
          </Box>

          <Box p={3} borderRadius="lg" bg="red.50" border="1px solid" borderColor="red.100" minW="100px">
            <HStack gap={1.5} color="red.600" mb={1}>
              <FiAlertTriangle size={13} />
              <Text fontSize="2xs" fontWeight="bold">INCUMPLIDAS</Text>
            </HStack>
            <Text fontSize="lg" fontWeight="bold" color="red.700">
              {incumplidas}
            </Text>
          </Box>
        </HStack>
      </Flex>

      {/* Barra de progreso de cumplimiento */}
      <Box w="100%" bg="gray.100" borderRadius="full" h="8px" overflow="hidden">
        <Box
          bg={barBg}
          h="100%"
          borderRadius="full"
          style={{ width: `${Math.min(porcentajeCumplimiento, 100)}%`, transition: "width 0.4s ease" }}
        />
      </Box>
    </Box>
  );
}