import { Dialog, Portal } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const FormModal = ({ open, onClose, children }: FormModalProps) => (
  <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>{children}</Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);