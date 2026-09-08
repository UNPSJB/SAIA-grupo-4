import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { CrearEquipo } from './CrearEquipo';
import { ListadoEquipo, type Equipo } from './ListadoEquipo';
import { ModificarEquipo } from './ModificarEquipo';
import { EliminarEquipo } from './EliminarEquipo';

type Vista = 'listado' | 'crear' | 'modificar';

export const EquiposPage = () => {
    const [vista, setVista] = useState<Vista>('listado');
    const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
    const [equipoEliminar, setEquipoEliminar] = useState<Equipo | null>(null);
    const [eliminarAbierto, setEliminarAbierto] = useState(false);
    const [refrescar, setRefrescar] = useState(0);

    return (
        <Box w="100%">
            {vista === 'listado' && (
                <ListadoEquipo
                    refrescar={refrescar}
                    onCrear={() => setVista('crear')}
                    onModificar={(equipo) => {
                        setEquipoSeleccionado(equipo);
                        setVista('modificar');
                    }}
                    onEliminar={(equipo) => {
                        setEquipoEliminar(equipo);
                        setEliminarAbierto(true);
                    }}
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
};