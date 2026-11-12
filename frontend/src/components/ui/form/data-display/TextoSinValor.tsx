import type { ReactNode } from "react";
import { Text } from "@chakra-ui/react";

/**
 * Texto para celdas sin dato ("No tiene", "Sin establecer", "Sin asignar"...).
 * Mismo gris en todos los listados.
 */
export const TextoSinValor = ({ children }: { children: ReactNode }) => (
  <Text as="span" color="gray.500">
    {children}
  </Text>
);
