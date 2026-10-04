import { Box } from "@chakra-ui/react";
import { ListadoVencimientos } from "../features/vencimientos/ListadoVencimientos";

// Pagina sin modales: el detalle de cada vencimiento vive en la pagina del
// modulo de origen, a la que navega ListadoVencimientos con ruta_detalle.
export default function VencimientosPage() {
  return (
    <Box textAlign='center' p={10} bg='gray.100' minH='100vh'>
      <ListadoVencimientos />
    </Box>
  );
}
