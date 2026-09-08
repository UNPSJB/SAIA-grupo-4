import { Box, ChakraProvider, defaultSystem } from '@chakra-ui/react';
import InsumoPage from './pages/InsumoPage';

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Box bg="gray.100" minH="100vh" w="100%">
        <InsumoPage />
      </Box>
    </ChakraProvider>
  );
}