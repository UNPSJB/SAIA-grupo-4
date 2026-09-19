import { Dialog, Portal, Button, Text, Alert, HStack } from "@chakra-ui/react";
import { FiTrash2, FiXCircle } from "react-icons/fi";

interface AlertDeleteProps {
  open: boolean;
  title?: string; // default "Eliminar"
  name: string | null; // nombre del elemento a eliminar
  loading?: boolean;
  error?: string;
  onConfirm: () => void; // función de borrado (ej: eliminar del hook)
  onCancel: () => void;
}

export const AlertDelete = ({
  open,
  title = "Eliminar",
  name,
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
            <Text>
              ¿Estás seguro que querés eliminar{" "}
              <Text as='span' fontWeight='bold' textTransform='capitalize'>
                {name}
              </Text>
              ? Esta acción no se puede deshacer.
            </Text>
            {error && (
              <Alert.Root status='error' mt={4}>
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant='outline' onClick={onCancel} disabled={loading}>
                <FiXCircle /> Cancelar
              </Button>
              <Button
                colorPalette='red'
                onClick={onConfirm}
                loading={loading}
                loadingText='Eliminando...'
              >
                <FiTrash2 /> Eliminar
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);
