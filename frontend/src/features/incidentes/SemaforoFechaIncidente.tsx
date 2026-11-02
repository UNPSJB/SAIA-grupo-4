import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { COLOR_ESTADO, type EstadoSemaforo } from "../../components/ui";

const MILISEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;

const formatearFechaHora = (fecha: string): string => {
  const fechaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha)
    ? fecha
    : `${fecha}Z`;

  return new Date(fechaConZona).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
};

interface SemaforoFechaIncidenteProps {
  /** Fecha y hora de reporte, tal como la devuelve el backend. */
  fecha: string;
}

/**
 * Fecha del incidente con el mismo estilo visual que los vencimientos.
 *
 * El color representa la antigüedad del reporte, no un vencimiento: verde
 * hasta 6 días, amarillo entre 7 y 29, rojo desde 30.
 */
export const SemaforoFechaIncidente = ({
  fecha,
}: SemaforoFechaIncidenteProps) => {
  if (!fecha) return <Text>—</Text>;

  const fechaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha)
    ? fecha
    : `${fecha}Z`;
  const fechaReporte = new Date(fechaConZona);

  if (Number.isNaN(fechaReporte.getTime())) return <Text>—</Text>;

  const diasTranscurridos = Math.max(
    0,
    Math.floor((Date.now() - fechaReporte.getTime()) / MILISEGUNDOS_POR_DIA),
  );

  let estado: EstadoSemaforo;
  if (diasTranscurridos >= 30) {
    estado = "vencido";
  } else if (diasTranscurridos >= 7) {
    estado = "proximo";
  } else {
    estado = "vigente";
  }

  const leyenda =
    diasTranscurridos === 0
      ? "(Hoy)"
      : `(Hace ${diasTranscurridos} ${
          diasTranscurridos === 1 ? "día" : "días"
        })`;

  return (
    <VStack gap={0} align='start'>
      <HStack gap={2}>
        <Box
          w={3}
          h={3}
          borderRadius='full'
          bg={`${COLOR_ESTADO[estado]}.500`}
          flexShrink={0}
        />
        <Text>{formatearFechaHora(fecha)}</Text>
      </HStack>
      <Text fontSize='sm' fontStyle='italic' color='gray.500'>
        {leyenda}
      </Text>
    </VStack>
  );
};
