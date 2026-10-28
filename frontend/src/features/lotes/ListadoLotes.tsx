import { useEffect, useState } from 'react';
import { Box, Table, Heading, Spinner, Text, Alert, Badge } from '@chakra-ui/react';
import { FiList } from 'react-icons/fi';
import { getLotes } from './lotesService';
import type { Lote } from './types';

interface ListadoLotesProps {
  reloadSignal?: number; 
}

export const ListadoLotes = ({ reloadSignal }: ListadoLotesProps) => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchLotes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLotes();
      setLotes(data);
    } catch (err) {
      setError('Error al cargar el historial de lotes de producción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, [reloadSignal]);

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="green.500" />
        <Text mt={2}>Cargando lotes de producción...</Text>
      </Box>
    );
  }

  return (
    <Box mt={8} p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <Heading size="lg" mb={4} color="gray.700">
        <FiList style={{ display: 'inline', marginRight: 8 }} />
        Historial de Lotes Producidos
      </Heading>

      {error && (
        <Alert.Root status="error" mb={4}>
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {lotes.length === 0 ? (
        <Text color="gray.500">No hay lotes de producción registrados aún.</Text>
      ) : (
        <Table.Root variant="line" size="md">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ID Lote</Table.ColumnHeader>
              <Table.ColumnHeader>Producto</Table.ColumnHeader>
              <Table.ColumnHeader>Fecha de Producción</Table.ColumnHeader>
              <Table.ColumnHeader>Cantidad Producida</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {lotes.map((lote) => (
              <Table.Row key={lote.id}>
                <Table.Cell>
                  <Badge colorPalette="green">#{lote.id}</Badge>
                </Table.Cell>
                <Table.Cell fontWeight="medium">{lote.producto?.nombre || 'N/A'}</Table.Cell>
                <Table.Cell>{lote.fecha}</Table.Cell>
                <Table.Cell fontWeight="bold">{lote.cantidad}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
};