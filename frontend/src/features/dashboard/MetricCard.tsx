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
}

// Tarjeta de métrica
export function MetricCard({
  metricKey,
  titulo,
  valor,
  unidad,
  detalle,
  link,
}: MetricCardProps) {
  const navigate = useNavigate();
  const color = getCardColor(metricKey);

  const formatValue = () => {
    if (unidad === "porcentaje") {
      return `${valor}%`;
    }
    return valor.toString();
  };

  const handleClick = () => {
    if (link) {
      navigate(link);
    }
  };

  return (
    <Card.Root
      borderLeft="4px solid"
      borderLeftColor={color}
      shadow="md"
      cursor={link ? "pointer" : "default"}
      _hover={link ? { shadow: "lg", transform: "translateY(-2px)" } : {}}
      transition="all 0.2s"
      onClick={handleClick}
    >
      <Card.Body>
        <Flex justify="space-between" align="start" mb={2}>
          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            {titulo}
          </Text>
          {link && <FiExternalLink color="gray.400" />}
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
