import { Badge, Box, Flex, HStack, Input, Text } from "@chakra-ui/react";
import { FiLayers } from "react-icons/fi";
import type { InsumoTeoricoReceta } from "../types";

interface ConsumoInsumoCardProps {
  insumo: InsumoTeoricoReceta;
  cantidadTeorica: number;
  cantidadReal: string;
  onCambioCantidadReal: (valor: string) => void;
  disabled?: boolean;
}

export function ConsumoInsumoCard({
  insumo,
  cantidadTeorica,
  cantidadReal,
  onCambioCantidadReal,
  disabled = false,
}: ConsumoInsumoCardProps) {
  const cantRealNum = parseFloat(cantidadReal);
  const difiere = !isNaN(cantRealNum) && Math.abs(cantRealNum - cantidadTeorica) > 0.0001;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de control: Backspace, Delete, Tab, Escape, Enter, flechas, Home, End
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key)
    ) {
      return;
    }
    // Permitir combinaciones con Ctrl/Cmd (ej: Ctrl+A, Ctrl+C, Ctrl+V)
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    // Permitir un único punto decimal o coma (si no está ya presente)
    if ((e.key === "." || e.key === ",") && !cantidadReal.includes(".")) {
      return;
    }
    // Bloquear explícitamente cualquier caracter que no sea un dígito numérico (ej: e, E, +, -, letras, símbolos)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Reemplazar coma por punto y eliminar todo caracter no numérico
    const sanitizado = val.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    // Evitar múltiples puntos decimales
    const partes = sanitizado.split(".");
    const limpio = partes.length > 2 ? `${partes[0]}.${partes.slice(1).join("")}` : sanitizado;
    onCambioCantidadReal(limpio);
  };

  return (
    <Box
      bg="white"
      p={{ base: 3, md: 4 }}
      borderRadius="xl"
      boxShadow="xs"
      border="1px solid"
      borderColor="gray.200"
      borderLeft="4px solid"
      borderLeftColor={difiere ? "orange.400" : "green.500"}
      w="100%"
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
        <HStack gap={2} align="center">
          <FiLayers color="#319795" size={16} />
          <Text fontWeight="bold" fontSize="sm" color="gray.800">
            {insumo.nombre}
          </Text>
        </HStack>
        <HStack gap={1.5}>
          <Badge colorPalette="gray" variant="subtle" fontSize="2xs">
            Estimado: {cantidadTeorica} {insumo.unidad_medida_simbolo}
          </Badge>
          {difiere && (
            <Badge colorPalette="orange" variant="outline" fontSize="2xs">
              Ajustado
            </Badge>
          )}
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center" gap={3}>
        <Text fontSize="xs" color="gray.600">
          Consumo real utilizado:
        </Text>
        <HStack gap={1.5} align="center">
          <Input
            type="text"
            inputMode="decimal"
            size="sm"
            w={{ base: "110px", md: "130px" }}
            textAlign="right"
            fontWeight="bold"
            value={cantidadReal}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            disabled={disabled}
            placeholder={String(cantidadTeorica)}
            borderRadius="md"
            bg="gray.50"
          />
          <Text fontSize="xs" fontWeight="semibold" color="gray.600" minW="25px">
            {insumo.unidad_medida_simbolo}
          </Text>
        </HStack>
      </Flex>
    </Box>
  );
}
