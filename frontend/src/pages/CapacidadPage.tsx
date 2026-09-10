import { useState } from 'react';
import { Box, Button } from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
import { CrearCapacidad } from '../features/capacidad/CrearCapacidad';
import { ListadoCapacidades } from '../features/capacidad/ListadoCapacidad';
import { ModificarCapacidad } from '../features/capacidad/ModificarCapacidad';

interface Capacidad {
  id: number;
  nombre: string;
}

type Vista = 'listado' | 'crear' | 'modificar';

interface CapacidadPageProps {
  onVolver?: () => void;
}

export default function CapacidadPage({ onVolver }: CapacidadPageProps) {
  const [vista, setVista] = useState<Vista>('listado');
  const [capacidadSeleccionada, setCapacidadSeleccionada] = useState<Capacidad | null>(null);

  return (
    <Box textAlign="center" p={10} bg="gray.100" minH="100vh">
      {onVolver && (
        <Box maxW="4xl" mx="auto" mb={-4} textAlign="left">
          <Button variant="ghost" colorPalette="green" onClick={onVolver}>
            <FiArrowLeft />
            Volver a Personal
          </Button>
        </Box>
      )}
      {vista === 'listado' && (<ListadoCapacidades
            onCrear={() => setVista('crear')}
            onModificar={(capacidad) => { setCapacidadSeleccionada(capacidad); setVista('modificar'); }} />)}
      {vista === 'crear' && <CrearCapacidad onCancelar={() => setVista('listado')} />}
      {vista === 'modificar' && capacidadSeleccionada && (<ModificarCapacidad
            capacidad={capacidadSeleccionada}
            onCancelar={() => setVista('listado')}
            onGuardado={() => setVista('listado')}
        />
      )}
    </Box>
  );
}
