import { Badge } from "@chakra-ui/react";

interface EstadoIncidenteBadgeProps {
  abierto: boolean;
}

/** Estado visible de un incidente: pendiente mientras está abierto. */
export const EstadoIncidenteBadge = ({
  abierto,
}: EstadoIncidenteBadgeProps) => (
  <Badge colorPalette={abierto ? "orange" : "green"}>
    {abierto ? "Pendiente" : "Resuelto"}
  </Badge>
);
