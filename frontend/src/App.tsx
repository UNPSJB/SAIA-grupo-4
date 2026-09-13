import { useState } from 'react';
import { Box, ChakraProvider, defaultSystem, HStack, Button } from '@chakra-ui/react';
import { FiBox, FiUsers } from 'react-icons/fi';
import InsumoPage from './pages/InsumoPage';
import PersonaPage from './pages/PersonalPage';
import CapacidadPage from './pages/CapacidadPage';

type Modulo = 'insumo' | 'persona' | 'capacidad';

export default function App() {
  const [modulo, setModulo] = useState<Modulo>('persona');

  return (
    <ChakraProvider value={defaultSystem}>
      <Box bg="gray.100" minH="100vh" w="100%">
        <HStack justify="center" gap={4} pt={6}>
          <Button
            variant={modulo === 'persona' || modulo === 'capacidad' ? 'solid' : 'outline'}
            colorPalette="green"
            onClick={() => setModulo('persona')}
          >
            <FiUsers />
            Personal
          </Button>
          <Button
            variant={modulo === 'insumo' ? 'solid' : 'outline'}
            colorPalette="green"
            onClick={() => setModulo('insumo')}
          >
            <FiBox />
            Insumos
          </Button>
        </HStack>

        {modulo === 'persona' && <PersonaPage onVerCapacidades={() => setModulo('capacidad')} />}
        {modulo === 'insumo' && <InsumoPage />}
        {modulo === 'capacidad' && <CapacidadPage onVolver={() => setModulo('persona')} />}
      </Box>
    </ChakraProvider>
  );
}