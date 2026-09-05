import { Box } from '@chakra-ui/react';
import { CrearInsumo } from './componentes/insumo/CrearInsumo';

export default function App() {
  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      <CrearInsumo />
    </Box>
  );
}