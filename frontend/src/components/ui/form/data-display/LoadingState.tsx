import { HStack, Spinner, Text } from "@chakra-ui/react";

interface LoadingStateProps {
  message?: string;
  color?: string;
}

export const LoadingState = ({
  message = "Cargando datos...",
  color = "green.500",
}: LoadingStateProps) => (
  <HStack justify="center" py={10}>
    <Spinner color={color} />
    <Text>{message}</Text>
  </HStack>
);