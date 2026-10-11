import { useState, useRef } from "react";
import { Box, Button, Text, HStack, VStack, Icon, Badge } from "@chakra-ui/react";
import { FiUploadCloud, FiFile, FiCheck, FiX } from "react-icons/fi";

interface FilePickerProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File | null) => void;
  error?: string;
}

export const FilePicker = ({
  label = "Adjuntar Certificado (PDF o Imagen)",
  accept = ".pdf,.jpg,.jpeg,.png,.webp",
  maxSizeMB = 10,
  onFileSelect,
  error,
}: FilePickerProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`El archivo supera el límite permitido de ${maxSizeMB}MB`);
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setLocalError("");
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setLocalError("");
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Box w="100%">
      <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
        {label}
      </Text>

      <input
        type="file"
        ref={inputRef}
        accept={accept}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <Button
          type="button"
          variant="outline"
          w="100%"
          h="60px"
          borderStyle="dashed"
          borderWidth="2px"
          borderColor="gray.300"
          onClick={() => inputRef.current?.click()}
          _hover={{ borderColor: "green.500", bg: "green.50" }}
        >
          <HStack gap={2} color="gray.600">
            <Icon as={FiUploadCloud} boxSize={5} />
            <Text fontSize="sm">Seleccionar archivo (Máx. {maxSizeMB}MB)</Text>
          </HStack>
        </Button>
      ) : (
        <Box
          p={3}
          borderWidth="1px"
          borderRadius="md"
          borderColor="green.300"
          bg="green.50"
        >
          <HStack justify="space-between">
            <HStack gap={2}>
              <Icon as={FiFile} color="green.600" />
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="medium" color="gray.800" maxW="220px" lineClamp={1}>
                  {selectedFile.name}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </VStack>
            </HStack>
            <HStack>
              <Badge colorPalette="green">
                <HStack gap={1}>
                  <FiCheck />
                  <Text>Listo</Text>
                </HStack>
              </Badge>
              <Button size="xs" variant="ghost" colorPalette="red" onClick={handleRemove}>
                <FiX />
              </Button>
            </HStack>
          </HStack>
        </Box>
      )}

      {(error || localError) && (
        <Text color="red.500" fontSize="xs" mt={1}>
          {error || localError}
        </Text>
      )}
    </Box>
  );
};