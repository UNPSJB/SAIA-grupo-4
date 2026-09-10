import { Box, ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EquiposPage from './pages/EquiposPage';

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <Box bg="gray.100" minH="100vh" w="100%">
        <BrowserRouter>
          <Routes>
            {/* Si se va a la raíz ("/"), redirige a "/equipos" por ahora */}
            <Route path="/" element={<Navigate to="/equipos" replace />} />
            
            {/* Rutas activas */}
            <Route path="/equipos" element={<EquiposPage />} />
            
            {/* Aca irian las otras rutas */}
            
            {/* Ruta por si se escribe una URL que no existe */}
            <Route path="*" element={
              <Box p={4} textAlign="center">
                <h2>Página no encontrada</h2>
              </Box>
            } />
          </Routes>
        </BrowserRouter>
      </Box>
    </ChakraProvider>
  );
}