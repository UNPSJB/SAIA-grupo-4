import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { CrearInsumo } from './componentes/insumo/CrearInsumo';
import { ListadoInsumos } from './componentes/insumo/ListadoInsumo';
import { ModificarInsumo } from './componentes/insumo/ModificarInsumo';

interface Insumo {
  id: number;
  nombre: string;
  unidad_medida: string;
}

type Vista = 'listado' | 'crear' | 'modificar';

export default function App() {
  const [vista, setVista] = useState<Vista>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      {vista === 'listado' && (<ListadoInsumos 
            onCrear={() => setVista('crear')} 
            onModificar={(insumo) => { setInsumoSeleccionado(insumo); setVista('modificar'); }} />)}
      {vista === 'crear' && <CrearInsumo onCancelar={() => setVista('listado')} />}
      {vista === 'modificar' && insumoSeleccionado && (<ModificarInsumo
            insumo={insumoSeleccionado}
            onCancelar={() => setVista('listado')}
            onGuardado={() => setVista('listado')}
        />
      )}
    </Box>
  );
}