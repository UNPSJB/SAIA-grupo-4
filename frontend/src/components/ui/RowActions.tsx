import { HStack } from "@chakra-ui/react";

interface RowActionsProps {
  children: React.ReactNode;
  gap?: number;
}

export const RowActions = ({ children, gap = 2 }: RowActionsProps) => (
  <HStack justify="flex-end" gap={gap}>
    {children}
  </HStack>
);