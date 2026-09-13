import { useState, useEffect, useMemo } from 'react';
import { Box, Button, Heading, Table, HStack, Text, Alert, Spinner, Pagination, ButtonGroup, IconButton } from '@chakra-ui/react';
import { FiList, FiEdit2, FiTrash2, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { Equipo } from './types';

interface ListadoEquipoProps {
    onCrear: () => void;
    onModificar: (equipo: Equipo) => void;
    onEliminar: (equipo: Equipo) => void;
    refrescar: number; 
}

const ITEMS_POR_PAGINA = 5;

export const ListadoEquipo = ({ onCrear, onModificar, onEliminar, refrescar }: ListadoEquipoProps) => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        const fetchEquipos = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch('http://127.0.0.1:8000/equipos/');
                if (!res.ok) {
                    throw new Error(`Error ${res.status}`);
                }
                const data = await res.json();
                setEquipos(data);
            } catch (err: any) {
                setError('No se pudo cargar la lista de equipos.');
            } finally {
                setLoading(false);
            }
        };
        fetchEquipos();
    }, [refrescar]);

    const equiposPaginados = useMemo(() => {
        const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
        return equipos.slice(inicio, inicio + ITEMS_POR_PAGINA);
    }, [equipos, pagina]);

    return (
        <Box maxW="4xl" mx="auto" mt={20} p={10} borderWidth="1px" borderRadius="lg" boxShadow="lg">
            <HStack justify="space-between" mb={6}>
                <Heading size="2xl" color="green">
                    <FiList style={{ display: 'inline', marginRight: 8 }} />
                    Equipos
                </Heading>
                <Button colorPalette="green" onClick={onCrear}>
                    <FiPlus />
                    Nuevo equipo
                </Button>
            </HStack>

            {loading && (
                <HStack justify="center" py={10}>
                    <Spinner color="green.500" />
                    <Text>Cargando equipos...</Text>
                </HStack>
            )}
            
            {!loading && error && (
                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
            )}

            {!loading && !error && equipos.length === 0 && (
                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Title>Todavía no hay equipos cargados.</Alert.Title>
                </Alert.Root>
            )}

            {!loading && !error && equipos.length > 0 && (
                <>
                <Table.Root variant="line" size="md">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>Categoría</Table.ColumnHeader>
                            <Table.ColumnHeader>Ubicación</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {equiposPaginados.map((equipo) => (
                            <Table.Row key={equipo.id}>
                                <Table.Cell textTransform="capitalize">{equipo.nombre}</Table.Cell>
                                <Table.Cell textTransform="capitalize">{equipo.categoria}</Table.Cell>
                                <Table.Cell textTransform="capitalize">{equipo.ubicacion || '-'}</Table.Cell>
                                <Table.Cell textAlign="end">
                                    <HStack justify="flex-end" gap={2}>
                                        <Button size="sm" variant="ghost" colorPalette="blue" onClick={() => onModificar(equipo)}>
                                            <FiEdit2 />
                                        </Button>
                                        <Button size="sm" variant="ghost" colorPalette="red" onClick={() => onEliminar(equipo)}>
                                            <FiTrash2 />
                                        </Button>
                                    </HStack>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                <HStack justify="center" mt={4}>
                    <Text fontSize="sm" color="gray.600" textAlign="left">
                        {equipos.length === 1 ? "Total: 1 equipo" : `Total: ${equipos.length} equipos`}
                    </Text>
                
                    {equipos.length > ITEMS_POR_PAGINA && (
                        <Pagination.Root
                            count={equipos.length}
                            pageSize={ITEMS_POR_PAGINA}
                            page={pagina}
                            onPageChange={(e) => setPagina(e.page)}
                        >
                            <ButtonGroup variant="ghost" size="sm">
                                <Pagination.PrevTrigger asChild>
                                    <IconButton aria-label="Página anterior">
                                        <FiChevronLeft />
                                    </IconButton>
                                </Pagination.PrevTrigger>

                                <Pagination.Items
                                    render={(page) => (
                                        <IconButton
                                            variant={page.value === pagina ? "solid" : "ghost"}
                                            colorPalette={page.value === pagina ? "green" : "gray"}
                                            aria-label={`Página ${page.value}`}
                                        >
                                            {page.value}
                                        </IconButton>
                                    )}
                                />

                                <Pagination.NextTrigger asChild>
                                    <IconButton aria-label="Página siguiente">
                                        <FiChevronRight />
                                    </IconButton>
                                </Pagination.NextTrigger>
                            </ButtonGroup>
                        </Pagination.Root>
                    )}
                </HStack>
                </>
            )}
        </Box>
    );
};