import { Box, Heading } from "@chakra-ui/react";
import type { ComponentType, ReactNode } from "react";
import { FiTag } from "react-icons/fi";
import { FormGrid } from "../../../../components/ui";

interface SeccionProps {
  numero: number;
  titulo: string;
  children: ReactNode;
  Icon?: ComponentType<{ size?: number }>;
  /** Permite ocultar la sección sin desmontarla (conserva los valores del form). */
  visible?: boolean;
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
  visible = true,
}: SeccionProps) => (
  <Box
    w="100%"
    display={visible ? "block" : "none"}
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
    <FormGrid>{children}</FormGrid>
  </Box>
);