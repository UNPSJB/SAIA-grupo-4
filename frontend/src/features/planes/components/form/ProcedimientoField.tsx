import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { TextAreaField } from "../../../../components/ui";

interface ProcedimientoFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

const PLACEHOLDER_DEFAULT =
  "Ej.\n1. Desconectar energía eléctrica.\n2. Retirar residuos sólidos.";

/**
 * Campo del procedimiento paso a paso.
 *
 * El textarea es controlado: cada tecla actualiza el valor del formulario y
 * triggers el re-render de la vista previa numerada, que se arma partiendo el
 * texto por líneas, recortando y descartando las vacías.
 */
export const ProcedimientoField = ({
  value,
  onChange,
  disabled,
  error,
  placeholder = PLACEHOLDER_DEFAULT,
}: ProcedimientoFieldProps) => {
  const pasosVista = value
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <TextAreaField
        label="Pasos del procedimiento (uno por línea)"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        error={error}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
      />

      {pasosVista.length > 0 && (
        <Box
          w="100%"
          bg="gray.50"
          borderWidth="1px"
          borderRadius="md"
          p={3}
        >
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Vista previa del procedimiento
          </Text>
          <VStack align="start" gap={1}>
            {pasosVista.map((paso, i) => (
              <HStack key={i} align="start">
                <Text as="span" fontWeight="bold" minW={4}>
                  {i + 1}.
                </Text>
                <Text>{paso}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </>
  );
};
