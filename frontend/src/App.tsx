import { Box } from '@chakra-ui/react';
import Ejemplo from './componentes/ejemplo';

export default function App() {
  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      <Ejemplo />
    </Box>
  );
}