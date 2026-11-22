import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiExternalLink } from "react-icons/fi";
import type { AlertaRecursoNoOperable } from "./operabilidad";

interface BadgeOperabilidadProps {
  activo: boolean;
  operable?: boolean;
  motivos?: string[];
  mostrarMotivo?: boolean;
}

/**
 * Muestra "Activo", "No operable" (cuando está activo pero vencido) o
 * "Dado de baja" (cuando activo === false).
 */
export const BadgeOperabilidad = ({
  activo,
  operable = true,
  motivos = [],
  mostrarMotivo = false,
}: BadgeOperabilidadProps) => {
  if (!activo) {
    return (
      <VStack align="start" gap={0.5}>
        <Badge colorPalette="red" title={motivos.join(" ")}>
          Dado de baja
        </Badge>
        {mostrarMotivo && motivos.length > 0 && (
          <Text fontSize="2xs" color="red.600" textTransform="none">
            {motivos[0]}
          </Text>
        )}
      </VStack>
    );
  }

  if (operable === false) {
    return (
      <VStack align="start" gap={0.5}>
        <Badge colorPalette="orange" title={motivos.join(" ")}>
          No operable
        </Badge>
        {mostrarMotivo && motivos.length > 0 && (
          <Text fontSize="2xs" color="orange.700" textTransform="none">
            {motivos[0]}
          </Text>
        )}
      </VStack>
    );
  }

  return <Badge colorPalette="green">Activo</Badge>;
};

interface MotivosNoOperablesBoxProps {
  motivos?: string[];
  tipoBaja?: string | null;
  motivoBaja?: string | null;
}

export const MotivosNoOperablesBox = ({
  motivos = [],
  tipoBaja,
  motivoBaja,
}: MotivosNoOperablesBoxProps) => {
  if (motivos.length === 0 && !motivoBaja) return null;

  return (
    <Box
      p={2.5}
      bg="orange.50"
      borderWidth="1px"
      borderColor="orange.200"
      borderRadius="md"
    >
      <VStack align="start" gap={1}>
        {motivos.map((m, idx) => (
          <Text key={idx} fontSize="xs" color="orange.800">
            • {m}
          </Text>
        ))}
        {motivoBaja && !motivos.some((m) => m.includes(motivoBaja)) && (
          <Text fontSize="xs" color="gray.700">
            Motivo de baja: {motivoBaja}
          </Text>
        )}
        {tipoBaja === "automatica_vencimiento" && (
          <Badge colorPalette="orange" variant="subtle" size="xs">
            Baja automática por vencimiento
          </Badge>
        )}
        {tipoBaja === "manual" && (
          <Badge colorPalette="gray" variant="subtle" size="xs">
            Baja manual
          </Badge>
        )}
      </VStack>
    </Box>
  );
};

interface AlertasRecursosBannerProps {
  alertas?: AlertaRecursoNoOperable[];
  compacto?: boolean;
  titulo?: string;
}

/**
 * Muestra los motivos y un enlace directo a cada recurso no operable afectado.
 * Se reutiliza en listados y vistas de Recetas, Planes POES, Checklists y Lotes.
 */
export const AlertasRecursosBanner = ({
  alertas = [],
  compacto = false,
  titulo = "Recursos no operables asociados",
}: AlertasRecursosBannerProps) => {
  const navigate = useNavigate();

  if (!alertas || alertas.length === 0) return null;

  if (compacto) {
    return (
      <VStack align="start" gap={1} mt={1}>
        {alertas.map((alerta) => (
          <HStack
            key={`${alerta.tipo}-${alerta.id}`}
            gap={1.5}
            wrap="wrap"
            fontSize="2xs"
            color="orange.800"
            bg="orange.50"
            px={2}
            py={0.5}
            borderRadius="md"
            borderWidth="1px"
            borderColor="orange.200"
          >
            <FiAlertTriangle />
            <Text textTransform="none">
              <strong>{alerta.nombre}:</strong>{" "}
              {alerta.motivos[0] || "Recurso no operable"}
            </Text>
            <Button
              size="2xs"
              variant="plain"
              colorPalette="orange"
              textDecoration="underline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(alerta.ruta);
              }}
            >
              Ver recurso <FiExternalLink />
            </Button>
          </HStack>
        ))}
      </VStack>
    );
  }

  return (
    <Box
      p={3}
      bg="orange.50"
      borderWidth="1px"
      borderColor="orange.300"
      borderRadius="md"
      w="100%"
    >
      <HStack gap={2} mb={2} color="orange.800">
        <FiAlertTriangle />
        <Text fontSize="sm" fontWeight="bold">
          {titulo}
        </Text>
      </HStack>
      <VStack align="stretch" gap={1.5}>
        {alertas.map((alerta) => (
          <HStack
            key={`${alerta.tipo}-${alerta.id}`}
            justify="space-between"
            wrap="wrap"
            gap={2}
            bg="white"
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="orange.200"
          >
            <Box fontSize="xs" color="gray.800">
              <Text fontWeight="semibold">{alerta.nombre}</Text>
              <Text color="orange.800">
                {alerta.motivos.join(" ") || "Recurso no operable"}
              </Text>
            </Box>
            <Button
              size="xs"
              variant="outline"
              colorPalette="orange"
              onClick={() => navigate(alerta.ruta)}
            >
              Ir al recurso <FiExternalLink />
            </Button>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};