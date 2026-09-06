import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { CrearInsumo } from './componentes/insumo/CrearInsumo';
import { ListadoInsumos } from './componentes/insumo/ListadoInsumo';

type Vista = 'listado' | 'crear';

export default function App() {
  const [vista, setVista] = useState<Vista>('listado');

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      {vista === 'listado' && <ListadoInsumos onCrear={() => setVista('crear')} />}
      {vista === 'crear' && <CrearInsumo onCancelar={() => setVista('listado')} />}
    </Box>
  );
}