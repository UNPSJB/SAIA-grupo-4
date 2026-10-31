import { Box } from "@chakra-ui/react";

import { ListadoRecetasOperador } from "../features/recetas/ListadoRecetasOperador";

/**
 * Vista de catálogo de recetas activas del operador (sólo lectura).
 * El layout y la navegación los provee OperadorLayout; acá sólo vive el contenido.
 */
export default function RecetasOperadorPage() {
  return (
    <Box p={{ base: 4, md: 10 }} minH="100%">
      <ListadoRecetasOperador />
    </Box>
  );
}
