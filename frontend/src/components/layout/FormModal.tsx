import { Dialog, Icon, Portal } from "@chakra-ui/react";
import type { ElementType, ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface FormModalProps {
  open: boolean;
  title?: string;
  titleIcon?: ElementType;
  showClose?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const FormModal = ({
  open,
  title,
  titleIcon,
  showClose = false,
  onClose,
  children,
}: FormModalProps) => (
  <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            {title && (
              <Dialog.Title
                color='green'
                display='flex'
                alignItems='center'
                gap={2}
                pe={8}
              >
                {titleIcon && <Icon as={titleIcon} />}
                {title}
              </Dialog.Title>
            )}
            {showClose && (
              <Dialog.CloseTrigger
                _hover={{ color: "red.500", bg: "red.50" }}
                transition='background 0.2s, color 0.2s'
                cursor='pointer'
              >
                <FiX />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Header>
          <Dialog.Body>{children}</Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);