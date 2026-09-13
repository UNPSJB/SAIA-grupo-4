import { Alert } from '@chakra-ui/react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  visible?: boolean;
}

export const AlertMessage = ({
  type,
  message,
  visible = true,
}: AlertMessageProps) => {
  if (!visible) return null;
  return (
    <Alert.Root status={type}>
      <Alert.Indicator />
      <Alert.Title>{message}</Alert.Title>
    </Alert.Root>
  );
};