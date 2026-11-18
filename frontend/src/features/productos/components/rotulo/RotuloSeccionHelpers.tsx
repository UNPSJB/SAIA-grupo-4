import { Badge, Box, Button, HStack, Icon, Text } from "@chakra-ui/react";
import { FiInfo, FiRefreshCw, FiSliders } from "react-icons/fi";

export const MENSAJE_SIN_RECETA_ACTIVA =
  "Este producto no cuenta con una receta activa vigente. Para precargar automáticamente la lista de ingredientes y la información nutricional, primero debes dar de alta/activar la receta correspondiente";

export const norm = (val?: string | null) => (val ?? "").trim();

export const normComp = (val?: string | null) =>
  norm(val)
    .replace(/\u2014|\u2013/g, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

export const AvisoSinRecetaActiva = () => (
  <Box
    p={3.5}
    bg="blue.50"
    borderWidth="1px"
    borderColor="blue.200"
    borderRadius="md"
  >
    <HStack align="start" gap={2.5}>
      <Icon as={FiInfo} color="blue.600" boxSize={5} mt={0.5} flexShrink={0} />
      <Text fontSize="sm" color="blue.900" fontWeight="medium">
        {MENSAJE_SIN_RECETA_ACTIVA}
      </Text>
    </HStack>
  </Box>
);

interface BadgeEstadoRotuloProps {
  modificado: boolean;
  etiquetaAuto: string;
  puedeRestaurar: boolean;
  onRestaurar: () => void;
}

export const BadgeEstadoRotulo = ({
  modificado,
  etiquetaAuto,
  puedeRestaurar,
  onRestaurar,
}: BadgeEstadoRotuloProps) => (
  <HStack gap={2} flexWrap="wrap">
    {modificado ? (
      <>
        <Badge colorPalette="orange" variant="subtle" size="sm">
          <Icon as={FiSliders} mr={1} />
          Modificado manualmente / Difiere de la receta
        </Badge>
        {puedeRestaurar && (
          <Button
            type="button"
            size="xs"
            variant="outline"
            colorPalette="orange"
            onClick={onRestaurar}
          >
            <FiRefreshCw /> Restaurar cálculo automático
          </Button>
        )}
      </>
    ) : (
      puedeRestaurar && (
        <Badge colorPalette="teal" variant="subtle" size="sm">
          {etiquetaAuto}
        </Badge>
      )
    )}
  </HStack>
);
