import { Box, SimpleGrid } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface FormGridProps {
  children: ReactNode;
  /**
   * Cantidad de columnas en escritorio. En mobile siempre se usa una sola
   * columna para evitar campos demasiado angostos.
   */
  columns?: 1 | 2;
}

/**
 * Distribución estándar de campos de formulario.
 *
 * Los campos cortos ocupan una celda; los bloques que necesitan todo el ancho
 * (textareas, archivos, checkboxes, mensajes) se envuelven con `FormGridFull`.
 */
export const FormGrid = ({ children, columns = 2 }: FormGridProps) => (
  <SimpleGrid
    columns={{ base: 1, md: columns }}
    gap={4}
    w='100%'
    alignItems='start'
  >
    {children}
  </SimpleGrid>
);

interface FormGridFullProps {
  children: ReactNode;
}

/** Fuerza un campo o bloque a ocupar todas las columnas de la grilla. */
export const FormGridFull = ({ children }: FormGridFullProps) => (
  <Box gridColumn='1 / -1' minW='0'>
    {children}
  </Box>
);
