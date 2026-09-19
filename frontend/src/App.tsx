import { Box, ChakraProvider, Flex, defaultSystem } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/layout';
import EquiposPage from './pages/EquiposPage';
import InsumoPage from './pages/InsumoPage';

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Flex minH="100vh" w="100%">
          <NavBar />
          <Box bg="gray.100" flex="1" minW="0">
            <Routes>
              {/* Si se va a la raíz ("/"), redirige a "/equipos" por ahora */}
              <Route path="/" element={<Navigate to="/equipos" replace />} />
              
              {/* Rutas activas */}
              <Route path="/equipos" element={<EquiposPage />} />
              
              {/* Aca irian las otras rutas */}
              <Route path='/insumos' element={<InsumoPage/>}/>

              {/* Ruta por si se escribe una URL que no existe */}
              <Route path="*" element={
                <Box p={4} textAlign="center">
                  <h2>Página no encontrada</h2>
                </Box>
              } />
            </Routes>
          </Box>
        </Flex>
      </BrowserRouter>
    </ChakraProvider>
  );
}