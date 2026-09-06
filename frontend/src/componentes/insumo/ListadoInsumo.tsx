import { useState, useEffect } from "react";
import { Box, Button, Heading, Table, Menu, IconButton, HStack, Text, Alert, Spinner } from "@chakra-ui/react";
import { FiList, FiMoreVertical, FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

interface Insumo {
    nombre: string;
    unidad_medida: string;
}

interface ListadoInsumosProps {
  onCrear?: () => void;
  onModificar?: (insumo: Insumo) => void;
  onEliminar?: (insumo: Insumo) => void;
}

export const ListadoInsumos = ({ onCrear, onModificar, onEliminar }: ListadoInsumosProps) => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarInsumos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://127.0.0.1:8000/insumos/');
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const data = await res.json();
      setInsumos(data);
    } catch (err: any) {
      setError('No se pudo cargar la lista de insumos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInsumos();
  }, []);

  return (
    <Box maxW="4xl" mx="auto" mt={20} p={10} borderWidth="1px" borderRadius="lg" boxShadow="lg">
      <HStack justify="space-between" mb={6}>
        <Heading size="2xl" color="green.600">
          <FiList style={{ display: 'inline', marginRight: 8 }} />
          Insumos
        </Heading>
        <Button colorPalette="green" onClick={onCrear}>
          <FiPlus />
          Nuevo insumo
        </Button>
      </HStack>

      {loading && (
        <HStack justify="center" py={10}>
          <Spinner color="green.500" />
          <Text>Cargando insumos...</Text>
        </HStack>
      )}
    
      {!loading && error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {!loading && !error && insumos.length === 0 && (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>Todavía no hay insumos cargados.</Alert.Title>
        </Alert.Root>
      )}

      {!loading && !error && insumos.length > 0 && (
        <Table.Root variant="line" size="md">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Nombre</Table.ColumnHeader>
              <Table.ColumnHeader>Unidad de medida</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Acciones</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {insumos.map((insumo) => (
              <Table.Row key={insumo.nombre}>
                <Table.Cell textTransform="capitalize">{insumo.nombre}</Table.Cell>
                <Table.Cell textTransform="capitalize">{insumo.unidad_medida}</Table.Cell>
                <Table.Cell textAlign="end">
                    <HStack justify="flex-end" gap={2}>
                        <Button size="sm" variant="ghost" colorPalette="blue" onClick={() => onModificar?.(insumo)}>
                        <FiEdit2 />
                        </Button>
                        <Button size="sm" variant="ghost" colorPalette="red" onClick={() => onEliminar?.(insumo)}>
                        <FiTrash2 />
                        </Button>
                    </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
};