import { Box, Heading, VStack } from "@chakra-ui/react";
import type { ComponentType, ReactNode } from "react";
import { FiTag } from "react-icons/fi";

interface SeccionProps {
  numero: number;
  titulo: string;
  children: ReactNode;
  Icon?: ComponentType<{ size?: number }>;
}

/**
 * Wrapper visual para cada sección del formulario.
 * Proporciona numeración, título con icono, borde y espaciado consistente.
 */
export const Seccion = ({
  numero,
  titulo,
  children,
  Icon = FiTag,
}: SeccionProps) => (
  <Box
    w="100%"
    borderWidth="1px"
    borderColor="border.subtle"
    borderRadius="md"
    p={4}
  >
    <Heading
      size="sm"
      textTransform="uppercase"
      color="green"
      display="flex"
      alignItems="center"
      gap={2}
      mb={4}
    >
      <Icon /> {numero}. {titulo}
    </Heading>
    <VStack gap={4} align="start" w="100%">
      {children}
    </VStack>
  </Box>
);