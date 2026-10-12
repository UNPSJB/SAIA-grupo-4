import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";
import { AlertMessage, LoadingState } from "../../components/ui";
import { useListadoData } from "../../hooks/useListadoData";
import type { HistorialIncidente as HistorialItem } from "./types";

interface Props {
  incidenteId: number;
}

const formatearFecha = (fecha: string) =>
  new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const HistorialIncidente = ({ incidenteId }: Props) => {
  const { data, loading, error } = useListadoData<HistorialItem>({
    endpoint: `http://127.0.0.1:8000/incidentes/${incidenteId}/historial`,
    errorMessage: "No se pudo cargar el historial.",
  });

  if (loading) return <LoadingState message="Cargando historial..." />;
  if (error) return <AlertMessage type="error" message={error} />;
  if (data.length === 0) {
    return <AlertMessage type="info" message="Este incidente todavía no tiene movimientos." />;
  }

  return (
    <Stack gap={3} textAlign="left">
      {data.map((item) => (
        <Box key={item.id} p={3} borderWidth="1px" borderRadius="md" bg="white">
          <HStack justify="space-between" mb={1}>
            <Badge colorPalette={item.estado_nuevo === "cerrado" ? "red" : "green"}>
              {item.estado_nuevo === "cerrado" ? "Cerrado" : "Reabierto"}
            </Badge>
            <Text fontSize="sm" color="gray.600">
              {formatearFecha(item.fecha)}
            </Text>
          </HStack>
          <Text fontSize="xs" color="gray.500">
          {item.estado_nuevo === "cerrado" ? "Acción correctiva" : "Motivo de reapertura"}
          </Text>
          <Text>{item.motivo}</Text>          
            {item.responsable && (
            <Text fontSize="sm" color="gray.600" mt={1}>
              Responsable: {item.responsable.nombre} {item.responsable.apellido}
            </Text>
          )}
        </Box>
      ))}
    </Stack>
  );
};