import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { CrearEquipo } from '../features/equipos/CrearEquipo';
import { ListadoEquipo } from '../features/equipos/ListadoEquipo';
import { ModificarEquipo } from '../features/equipos/ModificarEquipo';
import { EliminarEquipo } from '../features/equipos/EliminarEquipo';
import type { Equipo } from '../features/equipos/types';

type Vista = 'listado' | 'crear' | 'modificar';

export default function EquiposPage() {
  const [vista, setVista] = useState<Vista>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
  const [equipoEliminar, setEquipoEliminar] = useState<Equipo | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [refrescar, setRefrescar] = useState(0);

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      {vista === 'listado' && (
        <ListadoEquipo
          refrescar={refrescar}
          onCrear={() => setVista('crear')} 
          onModificar={(equipo) => { setEquipoSeleccionado(equipo); setVista('modificar'); }}
          onEliminar={(equipo) => { setEquipoEliminar(equipo); setEliminarAbierto(true); }} 
        />
      )}
      
      {vista === 'crear' && <CrearEquipo onCancelar={() => setVista('listado')} />}
      
      {vista === 'modificar' && equipoSeleccionado && (
        <ModificarEquipo
          equipo={equipoSeleccionado}
          onCancelar={() => setVista('listado')}
          onGuardado={() => setVista('listado')}
        />
      )}
      
      <EliminarEquipo
        equipo={equipoEliminar}
        open={eliminarAbierto}
        onCancelar={() => setEliminarAbierto(false)}
        onEliminar={() => setRefrescar((prev) => prev + 1)}
      />
    </Box>
  );
}