import { Dialog, Portal, Button, Text, Alert, HStack } from "@chakra-ui/react";
import { FiCheck, FiXCircle } from "react-icons/fi";

interface AlertConfirmProps {
  open: boolean;
  title?: string; // default "Dar de alta"
  message?: string; // texto de confirmación
  loading?: boolean;
  error?: string;
  onConfirm: () => void; // función de confirmación (ej: reactivar del hook)
  onCancel: () => void;
}

export const AlertConfirm = ({
  open,
  title,
  message,
  loading = false,
  error = "",
  onConfirm,
  onCancel,
}: AlertConfirmProps) => (
  <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancel()}>
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text>{message} </Text>

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
                colorPalette='green'
                onClick={onConfirm}
                loading={loading}
                loadingText='Dando de alta...'
              >
                <FiCheck /> Confirmar
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);
