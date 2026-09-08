import { useState, useEffect } from 'react';
import { Box, Button, HStack, Text, Heading, VStack, Spinner } from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

// Definimos la interfaz acá para que el listado sepa qué datos llegan
export interface Equipo {
    id: number;
    nombre: string;
    categoria: string;
    ubicacion?: string;
}

interface ListadoEquipoProps {
    onCrear: () => void;
    onModificar: (equipo: Equipo) => void;
    onEliminar: (equipo: Equipo) => void;
    refrescar: number; 
}

export const ListadoEquipo = ({ onCrear, onModificar, onEliminar, refrescar }: ListadoEquipoProps) => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEquipos = async () => {
            try {
                const res = await fetch('http://127.0.0.1:8000/equipos/');
                if (res.ok) {
                    const data = await res.json();
                    setEquipos(data);
                }
            } catch (error) {
                console.error("Error al cargar los equipos", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEquipos();
    }, [refrescar]); // Se vuelve a ejecutar si se elimina o crea algo

    return (
        <Box maxW="4xl" mx="auto" mt={10} p={5}>
            <HStack justify="space-between" mb={6}>
                <Heading size="xl" color="blue.600">Listado de Equipos</Heading>
                <Button colorPalette="blue" onClick={onCrear}>
                    <FiPlus /> Nuevo Equipo
                </Button>
            </HStack>

            {loading ? (
                <Spinner size="xl" />
            ) : equipos.length === 0 ? (
                <Text fontSize="lg" color="gray.500">No hay equipos registrados todavía.</Text>
            ) : (
                <VStack gap={4} align="stretch">
                    {equipos.map((equipo) => (
                        <Box key={equipo.id} p={5} borderWidth="1px" borderRadius="md" shadow="sm" bg="white">
                            <HStack justify="space-between">
                                <Box>
                                    <Text fontWeight="bold" fontSize="xl" textTransform="capitalize">{equipo.nombre}</Text>
                                    <Text color="gray.600">Categoría: {equipo.categoria}</Text>
                                    {equipo.ubicacion && <Text color="gray.500" fontSize="sm">Ubicación: {equipo.ubicacion}</Text>}
                                </Box>
                                <HStack>
                                    <Button size="sm" colorPalette="yellow" variant="outline" onClick={() => onModificar(equipo)}>
                                        <FiEdit2 /> Modificar
                                    </Button>
                                    <Button size="sm" colorPalette="red" variant="outline" onClick={() => onEliminar(equipo)}>
                                        <FiTrash2 /> Eliminar
                                    </Button>
                                </HStack>
                            </HStack>
                        </Box>
                    ))}
                </VStack>
            )}
        </Box>
    );
};