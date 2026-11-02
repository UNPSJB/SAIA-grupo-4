import { Box, Field, Input, Text, Button } from "@chakra-ui/react";
import { FiFile, FiUpload, FiX } from "react-icons/fi";

interface FileUploadFieldProps {
  value: File | null | undefined;
  onChange: (file: File | null) => void;
  error?: string;
  label?: string;
  accept?: string;
  disabled?: boolean;
  /** Texto personalizado para el estado vacío */
  placeholder?: string;
  /** Texto personalizado cuando hay archivo seleccionado */
  selectedText?: string;
  /** Color del icono cuando hay archivo (por defecto verde) */
  selectedColor?: string;
  /** Mostrar botón para quitar archivo */
  showRemoveButton?: boolean;
}

export const FileUploadField = ({
  value,
  onChange,
  error,
  label,
  accept = ".pdf,.jpg,.jpeg,.png,.webp",
  disabled = false,
  placeholder = "Haz clic para adjuntar archivo",
  selectedText = "Cambiar",
  selectedColor = "green.500",
  showRemoveButton = false,
}: FileUploadFieldProps) => {
  const handleRemove = () => {
    onChange(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
    // Permite volver a elegir el mismo archivo tras quitarlo
    e.target.value = "";
  };

  return (
    <Field.Root invalid={!!error} mb={4} gridColumn="1 / -1">
      {label && (
        <Field.Label fontSize="md" fontFamily="sans-serif">
          {label}
        </Field.Label>
      )}
      {!disabled && (
        <Box
          as="label"
          cursor="pointer"
          border="2px dashed"
          borderColor={error ? "red.400" : value ? "green.400" : "gray.300"}
          borderRadius="md"
          p={4}
          w="100%"
          display="flex"
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap={3}
          bg={value ? "green.50" : "gray.50"}
          _hover={{ bg: value ? "green.100" : "gray.100" }}
          transition="all 0.2s"
        >
          {value ? (
            <>
              <Box color={selectedColor}>
                <FiFile size={24} />
              </Box>
              <Text fontWeight="semibold" color={selectedColor === "green.500" ? "green.700" : "inherit"}>
                {value.name}
              </Text>
              {showRemoveButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  ml={2}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <FiX size={18} />
                </Button>
              )}
              <Text fontSize="sm" color={selectedColor === "green.500" ? "green.600" : "gray.500"}>
                ({selectedText})
              </Text>
            </>
          ) : (
            <>
              <Box color="gray.400">
                <FiUpload size={24} />
              </Box>
              <Text fontWeight="medium" color="gray.600">
                {placeholder}
              </Text>
            </>
          )}
          <Input
            type="file"
            accept={accept}
            display="none"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </Box>
      )}
      {disabled && (
        <Box
          border="2px dashed"
          borderColor={value ? "green.300" : "gray.300"}
          borderRadius="md"
          p={4}
          w="100%"
          display="flex"
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap={3}
          bg={value ? "green.50" : "gray.50"}
        >
          {value ? (
            <>
              <Box color="green.500">
                <FiFile size={24} />
              </Box>
              <Text fontWeight="semibold" color="green.700">
                {value.name}
              </Text>
              <Text fontSize="sm" color="green.600">
                (Solo lectura)
              </Text>
            </>
          ) : (
            <>
              <Box color="gray.400">
                <FiUpload size={24} />
              </Box>
              <Text fontWeight="medium" color="gray.500">
                {placeholder} (Solo lectura)
              </Text>
            </>
          )}
        </Box>
      )}
      {error && (
        <Text color="red.500" fontSize="sm" mt={1}>
          {error}
        </Text>
      )}
    </Field.Root>
  );
};