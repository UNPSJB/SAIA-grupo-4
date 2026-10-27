import { Box, Card, Text, VStack } from "@chakra-ui/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { GraficoConfig } from "./types";
import { getChartColor } from "./utils/chartColors";
import { SegmentedBar } from "./SegmentedBar";

interface DashboardChartProps {
  title: string;
  config: GraficoConfig;
  metricKey: string;
}

const USE_SEGMENTED_BAR = new Set([
  "vencimientos",
  "vencimientos_equipos",
  "vencimientos_personal",
  "vencimientos_documentos",
  "vencimientos_elementos_limpieza",
  "incidentes",
]);

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <Box bg="white" p={2} borderRadius="md" shadow="md" border="1px solid" borderColor="gray.200">
      <Text fontSize="xs" fontWeight="medium">{data.name}</Text>
      <Text fontSize="xs" color="gray.600">{data.value}</Text>
    </Box>
  );
};

const EmptyChart = ({ title, leyendas }: { title: string; leyendas?: Array<{ label: string }> }) => (
  <Card.Root shadow="md" h="full">
    <Card.Header>
      <Text fontSize="md" fontWeight="semibold">{title}</Text>
    </Card.Header>
    <Card.Body>
      <VStack py={8} gap={4}>
        <Text color="gray.500" fontSize="sm">Sin datos para mostrar</Text>
        {leyendas && leyendas.length > 0 && (
          <VStack align="stretch" gap={2} w="full">
            {leyendas.map((leyenda, idx) => (
              <Box key={idx} display="flex" alignItems="center" gap={2}>
                <Box w={3} h={3} borderRadius="full" bg="#A0AEC0" flexShrink={0} />
                <Text fontSize="xs" color="gray.600">{leyenda.label}</Text>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Card.Body>
  </Card.Root>
);

const PieChartView = ({ title, config }: { title: string; config: GraficoConfig }) => {
  const data = config.datos.map((item, index) => ({
    name: item.label,
    value: item.valor,
    color: getChartColor(item.label, index),
  }));

  return (
    <Card.Root shadow="md" h="full">
      <Card.Header>
        <Text fontSize="md" fontWeight="semibold">{title}</Text>
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={110} dataKey="value" labelLine={false}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <VStack align="start" gap={2} mt={2}>
          {config.leyendas.map((leyenda, idx) => {
            const dato = config.datos[idx];
            const color = dato ? getChartColor(dato.label, idx) : "#A0AEC0";
            return (
              <Box key={idx} display="flex" alignItems="center" gap={2}>
                <Box w={3} h={3} borderRadius="full" bg={color} />
                <Text fontSize="xs" color="gray.600">{leyenda.label}</Text>
              </Box>
            );
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};

const SegmentedBarChart = ({ title, config }: { title: string; config: GraficoConfig }) => {
  const segmentos = config.datos.map((dato) => ({
    label: dato.label,
    valor: dato.valor,
  }));
  const total = segmentos.reduce((sum, seg) => sum + seg.valor, 0);

  return (
    <Card.Root shadow="md" h="full">
      <Card.Header>
        <Text fontSize="md" fontWeight="semibold">{title}</Text>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Total: {total}
          </Text>
          <SegmentedBar segmentos={segmentos} mostrarLeyenda={true} />
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};

const FallbackBarChart = ({ title, config }: { title: string; config: GraficoConfig }) => {
  const total = config.datos.reduce((sum, item) => sum + item.valor, 0);
  return (
    <Card.Root shadow="md" h="full">
      <Card.Header>
        <Text fontSize="md" fontWeight="semibold">{title}</Text>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Total: {total}
          </Text>
          {config.datos.map((dato, idx) => {
            const porcentaje = total > 0 ? (dato.valor / total) * 100 : 0;
            const color = getChartColor(dato.label, idx);
            return (
              <Box key={idx}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.600">{dato.label}</Text>
                  <Text fontSize="xs" fontWeight="medium">
                    {dato.valor} ({porcentaje.toFixed(1)}%)
                  </Text>
                </Box>
                <Box h="8px" bg="gray.100" borderRadius="full" overflow="hidden">
                  <Box h="full" bg={color} w={`${porcentaje}%`} />
                </Box>
              </Box>
            );
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};

export function DashboardChart({ title, config, metricKey }: DashboardChartProps) {
  if (!config.datos || config.datos.length === 0) {
    return <EmptyChart title={title} leyendas={config.leyendas} />;
  }

  if (metricKey === "tareas") {
    return <PieChartView title={title} config={config} />;
  }

  if (USE_SEGMENTED_BAR.has(metricKey)) {
    return <SegmentedBarChart title={title} config={config} />;
  }

  return <FallbackBarChart title={title} config={config} />;
}
