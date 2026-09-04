import { Box } from '@chakra-ui/react';
import { CrearInsumo } from './componentes/CrearInsumo';

export default function App() {
  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      <CrearInsumo />
    </Box>
  );
}