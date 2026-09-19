import { HStack } from '@chakra-ui/react';

interface FormActionsProps {
  children: React.ReactNode;
  justify?: string;
  width?: string;
  spacing?: number | string;
}

export const FormActions = ({
  children,
  justify = 'center',
  width = '100%',
  spacing = 4,
}: FormActionsProps) => (
  <HStack justify={justify} width={width} gap={spacing}>
    {children}
  </HStack>
);