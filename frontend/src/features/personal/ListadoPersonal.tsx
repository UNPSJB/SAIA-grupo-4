import { useState, useEffect, useMemo } from "react";
import { Box, Button, Heading, Table, HStack, Text, Alert, Spinner, Pagination, ButtonGroup, IconButton, Badge, Wrap } from "@chakra-ui/react";
import { FiList, FiEdit2, FiTrash2, FiPlus, FiAward, FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface Persona {
    id: number;
    nombre: string;
    legajo: number;
    fecha_alta: string;
}

interface CapacidadDetalle {
    id: number;
    fecha_desde: string;
    fecha_hasta: string | null;
    capacidad: {
        id: number;
        nombre: string;
    };
}

interface ListadoPersonalProps {
  onCrear?: () => void;
  onModificar?: (persona: Persona) => void;
  onEliminar?: (persona: Persona) => void;
  onVerCapacidades?: () => void;
}

const ITEMS_POR_PAGINA = 5;

export const ListadoPersonal = ({ onCrear, onModificar, onEliminar, onVerCapacidades }: ListadoPersonalProps) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [capacidadesPorPersona, setCapacidadesPorPersona] = useState<Record<number, CapacidadDetalle[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);

  const cargarPersonas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:8000/personal/');
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const data: Persona[] = await res.json();
      setPersonas(data);

      // Traemos las capacidades de cada persona en paralelo
      const resultados = await Promise.all(
        data.map(async (persona) => {
          const resCap = await fetch(`http://127.0.0.1:8000/personal/${persona.id}/capacidades`);
          if (!resCap.ok) return { id: persona.id, capacidades: [] as CapacidadDetalle[] };
          const capacidades = await resCap.json();
          return { id: persona.id, capacidades };
        })
      );

      const mapa: Record<number, CapacidadDetalle[]> = {};
      resultados.forEach(({ id, capacidades }) => {
        mapa[id] = capacidades;
      });
      setCapacidadesPorPersona(mapa);
    } catch (err: any) {
      setError('No se pudo cargar la lista de personal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPersonas();
  }, []);

  type EstadoCapacidad = 'vigente' | 'por_vencer' | 'vencida';

  const colorPorEstado: Record<EstadoCapacidad, string> = {
    vigente: 'green',
    por_vencer: 'red',
    vencida: 'gray',
  };

  const estadoCapacidad = (fechaHasta: string | null): EstadoCapacidad => {
    if (!fechaHasta) {
      return 'vigente';
    }
    // Comparamos días de calendario, no instantes: normalizamos "hoy" a
    // medianoche UTC del día local actual, igual que "new Date('YYYY-MM-DD')"
    // ya parsea fechaHasta. Si no, mezclar hora local vs. medianoche UTC hacía
    // que una capacidad que vence hoy mismo diera 'vencida' antes de tiempo.
    const hoy = new Date();
    const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaVencimiento = new Date(fechaHasta);
    const diffDias = (fechaVencimiento.getTime() - hoyUTC) / (1000 * 60 * 60 * 24);

    if (diffDias < 0) {
      return 'vencida';
    } else if (diffDias <= 30) { // Umbral de 30 días para 'por_vencer'
      return 'por_vencer';
    } else {
      return 'vigente';
    }
  };

  const personasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    return personas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [personas, pagina]);

  return (
    <Box maxW="5xl" mx="auto" mt={20} p={10} borderWidth="1px" borderRadius="lg" boxShadow="lg">
      <HStack justify="space-between" mb={6}>
        <Heading size="2xl" color="green">
          <FiList style={{ display: 'inline', marginRight: 8 }} />
          Personal
        </Heading>
        <HStack gap={2}>
          <Button variant="outline" colorPalette="green" onClick={onVerCapacidades}>
            <FiAward />
            Capacidades
          </Button>
          <Button colorPalette="green" onClick={onCrear}>
            <FiPlus />
            Nueva persona
          </Button>
        </HStack>
      </HStack>

      {loading && (
        <HStack justify="center" py={10}>
          <Spinner color="green.500" />
          <Text>Cargando personal...</Text>
        </HStack>
      )}

      {!loading && error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {!loading && !error && personas.length === 0 && (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>Todavía no hay personal cargado.</Alert.Title>
        </Alert.Root>
      )}

      {!loading && !error && personas.length > 0 && (
        <>
        <Table.Root variant="line" size="md">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Nombre</Table.ColumnHeader>
              <Table.ColumnHeader>Legajo</Table.ColumnHeader>
              <Table.ColumnHeader>Fecha de alta</Table.ColumnHeader>
              <Table.ColumnHeader>Capacidades</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Acciones</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {personasPaginadas.map((persona) => (
              <Table.Row key={persona.id}>
                <Table.Cell textTransform="capitalize">{persona.nombre}</Table.Cell>
                <Table.Cell>{persona.legajo}</Table.Cell>
                <Table.Cell>{persona.fecha_alta}</Table.Cell>
                <Table.Cell>
                  <Wrap gap={1}>
                    {(capacidadesPorPersona[persona.id] ?? []).length === 0 && (
                      <Text fontSize="sm" color="gray.400">Sin capacidades</Text>
                    )}
                    {(capacidadesPorPersona[persona.id] ?? []).map((pc) => (
                      <Badge
                        key={pc.id}
                        colorPalette={colorPorEstado[estadoCapacidad(pc.fecha_hasta)]}
                        variant="subtle"
                      >
                        {pc.capacidad.nombre}
                      </Badge>
                    ))}
                  </Wrap>
                </Table.Cell>
                <Table.Cell textAlign="end">
                    <HStack justify="flex-end" gap={2}>
                        <Button size="sm" variant="ghost" colorPalette="blue" onClick={() => onModificar?.(persona)}>
                        <FiEdit2 />
                        </Button>
                        <Button size="sm" variant="ghost" colorPalette="red" onClick={() => onEliminar?.(persona)}>
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
            {personas.length === 1 ? "Total: 1 persona" : `Total: ${personas.length} personas`}
            </Text>

            {personas.length > ITEMS_POR_PAGINA && (
                <Pagination.Root
                    count={personas.length}
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