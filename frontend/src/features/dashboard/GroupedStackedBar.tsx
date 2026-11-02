import { Box, Card, Flex, Text, VStack } from "@chakra-ui/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getChartColor } from "./utils/chartColors";

interface GroupedBarData {
  categoria: string;
  [key: string]: string | number;
}

interface GroupedStackedBarProps {
  title: string;
  data: GroupedBarData[];
  keys: string[];
  keyLabels?: Record<string, string>;
}

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
    return (
      <Box bg="white" p={2} borderRadius="md" shadow="md" border="1px solid" borderColor="gray.200">
        <Text fontSize="xs" fontWeight="medium" mb={1}>{label}</Text>
        {payload.map((p: any, idx: number) => (
          <Text key={idx} fontSize="xs" color="gray.600">
            {p.name}: {p.value} ({total > 0 ? ((p.value / total) * 100).toFixed(1) : "0.0"}%)
          </Text>
        ))}
        <Text fontSize="xs" fontWeight="medium" mt={1} pt={1} borderTop="1px solid" borderColor="gray.100">
          Total: {total}
        </Text>
      </Box>
    );
  }
  return null;
};

// Gráfico de barras agrupadas con segmentos apilados
export function GroupedStackedBar({ title, data, keys, keyLabels = {} }: GroupedStackedBarProps) {
  if (!data || data.length === 0) {
    return (
      <Card.Root shadow="md" h="full">
        <Card.Header>
          <Text fontSize="md" fontWeight="semibold">{title}</Text>
        </Card.Header>
        <Card.Body>
          <VStack py={8}>
            <Text color="gray.500" fontSize="sm">Sin datos para mostrar</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root shadow="md" h="full">
      <Card.Header>
        <Text fontSize="md" fontWeight="semibold">{title}</Text>
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="categoria" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} height={60} />
            <YAxis tick={{ fontSize: 9 }} width={30} />
            <Tooltip content={<CustomTooltip />} />
            {keys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                name={keyLabels[key] || key}
                stackId="a"
                fill={getChartColor(keyLabels[key] || key, idx)}
                radius={idx === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {/* Leyenda */}
        <Flex gap={4} wrap="wrap" mt={4} justify="center">
          {keys.map((key, idx) => (
            <Flex key={key} align="center" gap={2}>
              <Box w={3} h={3} borderRadius="sm" bg={getChartColor(keyLabels[key] || key, idx)} />
              <Text fontSize="xs" color="gray.600">{keyLabels[key] || key}</Text>
            </Flex>
          ))}
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}
