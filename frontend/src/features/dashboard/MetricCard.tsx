import { Card, Flex, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FiExternalLink } from "react-icons/fi";
import { getCardColor } from "./utils/chartColors";

// Props de la tarjeta de métrica
interface MetricCardProps {
  metricKey: string;
  titulo: string;
  valor: number;
  unidad: "porcentaje" | "cantidad";
  detalle?: string | null;
  link?: string | null;
  /** Modo impresión: sin link, sin hover ni sombra, y sin cortarse entre hojas. */
  estatica?: boolean;
}

// Tarjeta de métrica
export function MetricCard({
  metricKey,
  titulo,
  valor,
  unidad,
  detalle,
  link,
  estatica = false,
}: MetricCardProps) {
  const navigate = useNavigate();
  const color = getCardColor(metricKey);

  const formatValue = () => {
    if (unidad === "porcentaje") {
      return `${valor}%`;
    }
    return valor.toString();
  };

  // En el informe impreso la tarjeta no navega a ningún lado
  const linkActivo = estatica ? null : link;

  const handleClick = () => {
    if (linkActivo) {
      navigate(linkActivo, { state: { origen: "dashboard" } });
    }
  };

  return (
    <Card.Root
      borderLeft="4px solid"
      borderLeftColor={color}
      shadow={estatica ? "none" : "md"}
      // Borde fino en los otros tres lados, sin pisar el borde izquierdo de color
      borderTopWidth={estatica ? "1px" : undefined}
      borderRightWidth={estatica ? "1px" : undefined}
      borderBottomWidth={estatica ? "1px" : undefined}
      borderTopColor={estatica ? "gray.200" : undefined}
      borderRightColor={estatica ? "gray.200" : undefined}
      borderBottomColor={estatica ? "gray.200" : undefined}
      className={estatica ? "no-cortar" : undefined}
      cursor={linkActivo ? "pointer" : "default"}
      _hover={linkActivo ? { shadow: "lg", transform: "translateY(-2px)" } : {}}
      transition="all 0.2s"
      onClick={handleClick}
    >
      <Card.Body>
        <Flex justify="space-between" align="start" mb={2}>
          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            {titulo}
          </Text>
          {linkActivo && <FiExternalLink color="gray.400" />}
        </Flex>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={1}>
          {formatValue()}
        </Text>
        {detalle && (
          <Text fontSize="xs" color="gray.500">
            {detalle}
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
}
