import { Box, ChakraProvider, defaultSystem } from '@chakra-ui/react';
import InsumoPage from './pages/InsumoPage';
import { BrowserRouter } from 'react-router-dom'; 
import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <ChakraProvider value={defaultSystem}>
        <Box bg="gray.100" minH="100vh" w="100%">

          <Routes>
            <Route path='/insumos' element={<InsumoPage/>}/>
          </Routes>
          
        </Box>
      </ChakraProvider>  
    </BrowserRouter>
  );
}