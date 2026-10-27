import { Dialog, Portal, Button, Text, Alert, HStack } from "@chakra-ui/react";
import { FiTrash2, FiXCircle } from "react-icons/fi";

interface AlertDeleteProps {
  open: boolean;
  title?: string; // default "Eliminar"
  name: string | null; // nombre del elemento a eliminar
  /** Texto de confirmación. Si no se envía, se usa el mensaje genérico. */
  message?: string;
  confirmLabel?: string;
  loadingText?: string;
  loading?: boolean;
  error?: string;
  onConfirm: () => void; // función de borrado (ej: eliminar del hook)
  onCancel: () => void;
}

export const AlertDelete = ({
  open,
  title = "Eliminar",
  name,
  message,
  confirmLabel = "Eliminar",
  loadingText = "Eliminando...",
  loading = false,
  error = "",
  onConfirm,
  onCancel,
}: AlertDeleteProps) => (
  <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancel()}>
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {message ? (
              <Text>{message}</Text>
            ) : (
              <Text>
                ¿Estás seguro que querés eliminar{" "}
                <Text as='span' fontWeight='bold' textTransform='capitalize'>
                  {name}
                </Text>
                ? Esta acción no se puede deshacer.
              </Text>
            )}
            {error && (
              <Alert.Root status='error' mt={4}>
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <HStack gap={2}>
              <Button
                variant='outline'
                onClick={onCancel}
                disabled={loading}
                colorPalette='red'
              >
                <FiXCircle /> Cancelar
              </Button>
              {!error && (
                <Button
                  colorPalette='red'
                  onClick={onConfirm}
                  loading={loading}
                  loadingText={loadingText}
                >
                  <FiTrash2 /> {confirmLabel}
                </Button>
              )}
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);
