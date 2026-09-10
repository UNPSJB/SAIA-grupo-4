import { useState, useEffect, useMemo } from "react";
import { Box, Button, Heading, Table, HStack, Text, Alert, Spinner, Pagination, ButtonGroup, IconButton } from "@chakra-ui/react";
import { FiAward, FiEdit2, FiPlus, FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface Capacidad {
    id: number;
    nombre: string;
}

interface ListadoCapacidadesProps {
  onCrear?: () => void;
  onModificar?: (capacidad: Capacidad) => void;
}

const ITEMS_POR_PAGINA = 5;

export const ListadoCapacidades = ({ onCrear, onModificar }: ListadoCapacidadesProps) => {
  const [capacidades, setCapacidades] = useState<Capacidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);

  const cargarCapacidades = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:8000/capacidades/');
      if (!res.ok) {
        throw new Error('Error al cargar las capacidades');
      }
      const data = await res.json();
      setCapacidades(data);
    } catch (error) {
      setError('Error al cargar las capacidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCapacidades();
  }, []);

  const capPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    return capacidades.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [capacidades, pagina]);

  return (
    <Box maxW="4xl" mx="auto" mt={20} p={10} borderWidth="1px" borderRadius="lg" boxShadow="lg">
      <HStack justify="space-between" mb={6}>
        <Heading size="2xl" color="green">
          <FiAward style={{ display: 'inline', marginRight: 8 }} />
          Capacidades
        </Heading>
        <Button colorPalette="green" onClick={onCrear}>
          <FiPlus />
          Nueva capacidad
        </Button>
      </HStack>

      {loading && (
        <HStack justify="center" py={10}>
          <Spinner color="green.500" />
          <Text>Cargando capacidades...</Text>
        </HStack>
      )}

      {!loading && error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {!loading && !error && capacidades.length === 0 && (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>Todavía no hay capacidades cargadas.</Alert.Title>
        </Alert.Root>
      )}

      {!loading && !error && capacidades.length > 0 && (
        <>
        <Table.Root variant="line" size="md">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Nombre</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Acciones</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {capPaginadas.map((capacidad) => (
              <Table.Row key={capacidad.id}>
                <Table.Cell textTransform="capitalize">{capacidad.nombre}</Table.Cell>
                <Table.Cell textAlign="end">
                    <HStack justify="flex-end" gap={2}>
                        <Button size="sm" variant="ghost" colorPalette="blue" onClick={() => onModificar?.(capacidad)}>
                        <FiEdit2 />
                        </Button>
                    </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <HStack justify="center" mt={4}>
            <Text fontSize="sm" color="gray.600" textAlign="left">
            {capacidades.length === 1 ? "Total: 1 capacidad" : `Total: ${capacidades.length} capacidades`}
            </Text>

            {capacidades.length > ITEMS_POR_PAGINA && (
                <Pagination.Root
                    count={capacidades.length}
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
