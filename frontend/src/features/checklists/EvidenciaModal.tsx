import { useState, useEffect } from "react";
import { Dialog, Portal, Button, Text, HStack, Box, Image, Input, VStack } from "@chakra-ui/react";
import { FiCamera, FiCheck, FiXCircle, FiTrash2 } from "react-icons/fi";

interface EvidenciaModalProps {
  open: boolean;
  tareaNombre: string;
  loading?: boolean;
  onConfirm: (foto: File | null) => void;
  onCancel: () => void;
}

export const EvidenciaModal = ({
  open,
  tareaNombre,
  loading = false,
  onConfirm,
  onCancel,
}: EvidenciaModalProps) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // si se cierra el modal, limpiamos la foto para que no quede guardada por error
  useEffect(() => {
    if (!open) {
      setArchivo(null);
      setPreview(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setPreview(URL.createObjectURL(file)); // Magia para mostrar la miniatura
    }
  };

  const handleQuitarFoto = () => {
    setArchivo(null);
    setPreview(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Completar Tarea</Dialog.Title>
            </Dialog.Header>
            
            <Dialog.Body>
              <Text mb={4}>
                ¿Confirmás que realizaste la tarea: <strong>{tareaNombre}</strong>?
              </Text>
              
              {/* Zona de subida de imagen con borde punteado */}
              <Box borderWidth="2px" borderStyle="dashed" borderColor="gray.300" borderRadius="md" p={4} textAlign="center">
                {!preview ? (
                  <Box position="relative">
                    <Button variant="outline" colorPalette="blue" w="100%">
                      <FiCamera style={{ display: 'inline', marginRight: 8 }} />
                      Adjuntar foto (Opcional)
                    </Button>
                    {/* Input invisible que abre la cámara/galería */}
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment" // camara trasera en celulares
                      position="absolute"
                      top="0" left="0" width="100%" height="100%"
                      opacity="0" cursor="pointer"
                      onChange={handleFileChange}
                    />
                  </Box>
                ) : (
                  <VStack gap={2}>
                    <Image src={preview} alt="Evidencia" maxH="200px" objectFit="contain" borderRadius="md" />
                    <Button size="sm" variant="ghost" colorPalette="red" onClick={handleQuitarFoto}>
                      <FiTrash2 style={{ display: 'inline', marginRight: 4 }} />
                      Quitar foto
                    </Button>
                  </VStack>
                )}
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  <FiXCircle style={{ display: 'inline', marginRight: 4 }} /> Cancelar
                </Button>
                <Button 
                  colorPalette="green" 
                  onClick={() => onConfirm(archivo)}
                  loading={loading}
                  loadingText="Guardando..."
                >
                  <FiCheck style={{ display: 'inline', marginRight: 4 }} /> Confirmar tarea
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};