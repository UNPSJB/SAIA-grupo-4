import { Box } from "@chakra-ui/react";

import { ListadoDocumentosOperador } from "../features/documentos/ListadoDocumentosOperador";

/**
 * Vista de documentos del operador (sólo lectura). El layout y la navegación
 * los provee OperadorLayout; acá sólo vive el contenido.
 */
export default function DocumentosOperadorPage() {
  return (
    <Box p={{ base: 4, md: 10 }} minH="100%">
      <ListadoDocumentosOperador />
    </Box>
  );
}
