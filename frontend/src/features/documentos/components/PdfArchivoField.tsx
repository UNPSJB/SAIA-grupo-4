import { Box, Field, Input, Text } from "@chakra-ui/react";
import { FiFileText, FiUpload } from "react-icons/fi";

interface PdfArchivoFieldProps {
  value: File | null | undefined;
  onChange: (file: File | null) => void;
  error?: string;
  label?: string;
}

// Dropzone para adjuntar el PDF oficial.

export const PdfArchivoField = ({ value, onChange, error, label }: PdfArchivoFieldProps) => (
  <Field.Root invalid={!!error} mb={4}>
    {label && (
      <Field.Label fontSize="md" fontFamily="sans-serif">
        {label}
      </Field.Label>
    )}
    <Box
      as="label"
      cursor="pointer"
      border="2px dashed"
      borderColor={error ? "red.400" : "gray.300"}
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
          <Box color="green.500">
            <FiFileText size={24} />
          </Box>
          <Text fontWeight="semibold" color="green.700">
            {value.name}
          </Text>
          <Text fontSize="sm" color="green.600">
            (Cambiar)
          </Text>
        </>
      ) : (
        <>
          <Box color="gray.400">
            <FiUpload size={24} />
          </Box>
          <Text fontWeight="medium" color="gray.600">
            Haz clic para adjuntar el PDF
          </Text>
        </>
      )}
      <Input
        type="file"
        accept=".pdf"
        display="none"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onChange(file);
          // Permite volver a elegir el mismo archivo tras quitarlo
          e.target.value = "";
        }}
      />
    </Box>
    {error && (
      <Text color="red.500" fontSize="sm" mt={1}>
        {error}
      </Text>
    )}
  </Field.Root>
);
