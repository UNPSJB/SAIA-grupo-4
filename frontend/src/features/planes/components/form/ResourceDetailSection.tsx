import { Box, HStack, Input, Text, VStack } from "@chakra-ui/react";
import type { InputHTMLAttributes } from "react";

export interface ResourceItem {
  id: number;
  nombre: string;
}

export interface InputConfig {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Texto informativo que se muestra junto al input (ej: unidad de medida) */
  hint?: string;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "onChange" | "value"> & {
    size?: "xs" | "sm" | "md" | "lg";
  };
}

interface ResourceDetailSectionProps {
  items: ResourceItem[];
  selectedIds: number[];
  /** Devuelve los inputs a renderizar para un item seleccionado */
  getInputs: (item: ResourceItem) => InputConfig[];
  /** Devuelve el mensaje de error de un item, si tiene */
  getError?: (id: number) => string | undefined;
  disabled?: boolean;
  title: string;
}

/**
 * Sección genérica de detalle para recursos seleccionados.
 *
 * Se usa tanto para insumos químicos (consumo + dilución) como para elementos de
 * limpieza (cantidad): el padre decide, vía `getInputs`, qué campos se pintan
 * para cada item. Si no hay items seleccionados no renderiza nada.
 */
export const ResourceDetailSection = ({
  items,
  selectedIds,
  getInputs,
  getError,
  disabled,
  title,
}: ResourceDetailSectionProps) => {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) return null;

  return (
    <Box
      w="100%"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="md"
      p={3}
    >
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        {title}
      </Text>
      <VStack align="stretch" gap={3}>
        {selectedItems.map((item) => {
          const error = getError?.(item.id);

          return (
            <Box key={item.id}>
              <HStack gap={2} align="center" flexWrap="wrap">
                <Text fontWeight="medium" flex="1" minW={44}>
                  {item.nombre}
                </Text>

                {getInputs(item).map((input, idx) => (
                  <HStack key={idx} gap={2} align="center">
                    <Text fontSize="sm" color="gray.600">
                      {input.label}
                    </Text>
                    <Input
                      disabled={disabled}
                      value={input.value}
                      onChange={(e) => input.onChange(e.target.value)}
                      placeholder={input.placeholder}
                      {...input.inputProps}
                    />
                    {input.hint && (
                      <Text fontSize="sm" color="gray.600" minW={8}>
                        {input.hint}
                      </Text>
                    )}
                  </HStack>
                ))}
              </HStack>

              {error && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {error}
                </Text>
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};
