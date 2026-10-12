import { Box, Text } from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EstadisticaTipoIncidente } from "./types";

interface Props {
  datos: EstadisticaTipoIncidente[];
  tipoSeleccionadoId?: number | null;
  onSeleccionarTipo: (tipo: EstadisticaTipoIncidente) => void;
}

const ALTO_POR_BARRA = 48;

export function GraficoIncidentesPorTipo({
  datos,
  tipoSeleccionadoId,
  onSeleccionarTipo,
}: Props) {
  return (
    <Box bg="white" p={{ base: 4, md: 5 }} borderRadius="xl" boxShadow="sm" border="1px solid" borderColor="gray.200" mb={4}>
      <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={3}>
        Cantidad de incidentes por tipo
      </Text>

      <Box h={`${Math.max(datos.length * ALTO_POR_BARRA, 160)}px`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="tipo" width={150} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(valor) => [valor, "Incidentes"]} />
            <Bar
              dataKey="cantidad"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(entry) => onSeleccionarTipo(entry.payload as EstadisticaTipoIncidente)}
            >
              {datos.map((d) => (
                <Cell
                  key={d.tipo_id}
                  fill={d.tipo_id === tipoSeleccionadoId ? "#276749" : "#48BB78"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Text fontSize="xs" color="gray.500" mt={2}>
        Hacé click en una barra para ver el detalle de los incidentes de ese tipo.
      </Text>
    </Box>
  );
}