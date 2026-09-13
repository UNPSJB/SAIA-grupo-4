import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { CrearInsumo } from '../features/insumo/CrearInsumo';
import { ListadoInsumos } from '../features/insumo/ListadoInsumo';
import { ModificarInsumo } from '../features/insumo/ModificarInsumo';
import { EliminarInsumo } from '../features/insumo/EliminarInsumo';
import type { Insumo } from '../utils/insumo/types';

type Vista = 'listado' | 'crear' | 'modificar';

export default function InsumoPage() {
  const [vista, setVista] = useState<Vista>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
  const [insumoEliminar, setInsumoEliminar] = useState<Insumo | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [refescar, setRefrescar] = useState(0);

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      {vista === 'listado' && (<ListadoInsumos
            key={refescar}
            onCrear={() => setVista('crear')} 
            onModificar={(insumo) => { setInsumoSeleccionado(insumo); setVista('modificar'); }}
            onEliminar={(insumo) => { setInsumoEliminar(insumo); setEliminarAbierto(true); }} />)}
      {vista === 'crear' && <CrearInsumo onCancelar={() => setVista('listado')} />}
      {vista === 'modificar' && insumoSeleccionado && (<ModificarInsumo
            insumo={insumoSeleccionado}
            onCancelar={() => setVista('listado')}
            onGuardado={() => setVista('listado')}
        />
      )}
      
      <EliminarInsumo
        insumo={insumoEliminar}
        open={eliminarAbierto}
        onCancelar={() => setEliminarAbierto(false)}
        onEliminar={() => setRefrescar((prev) => prev + 1)}
      />
    </Box>
  );
}