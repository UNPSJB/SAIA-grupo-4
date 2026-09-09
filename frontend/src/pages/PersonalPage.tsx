import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { CrearPersona } from '../features/personal/CrearPersona';
import { ListadoPersonal } from '../features/personal/ListadoPersonal';
import { ModificarPersona } from '../features/personal/ModificarPersona';
import { EliminarPersona } from '../features/personal/EliminarPersona';

interface Persona {
  id: number;
  nombre: string;
  legajo: number;
  fecha_alta: string;
}

type Vista = 'listado' | 'crear' | 'modificar';

export default function PersonaPage() {
  const [vista, setVista] = useState<Vista>('listado');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Persona | null>(null);
  const [personaEliminar, setPersonaEliminar] = useState<Persona | null>(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [refrescar, setRefrescar] = useState(0);

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      {vista === 'listado' && (<ListadoPersonal
            key={refrescar}
            onCrear={() => setVista('crear')}
            onModificar={(persona) => { setPersonaSeleccionada(persona); setVista('modificar'); }}
            onEliminar={(persona) => { setPersonaEliminar(persona); setEliminarAbierto(true); }} />)}
      {vista === 'crear' && <CrearPersona onCancelar={() => setVista('listado')} />}
      {vista === 'modificar' && personaSeleccionada && (<ModificarPersona
            persona={personaSeleccionada}
            onCancelar={() => setVista('listado')}
            onGuardado={() => setVista('listado')}
        />
      )}

      <EliminarPersona
        persona={personaEliminar}
        open={eliminarAbierto}
        onCancelar={() => setEliminarAbierto(false)}
        onEliminar={() => setRefrescar((prev) => prev + 1)}
      />
    </Box>
  );
}