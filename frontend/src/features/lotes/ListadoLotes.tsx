import { useState } from "react";
import { 
  Box, Heading, Table, Badge, IconButton, Text 
} from "@chakra-ui/react";
import { FiEye, FiList } from "react-icons/fi";
import type { Lote } from "./types";
import { LoteDetalle } from "./LoteDetalle";

interface ListadoLotesProps {
  lotes?: Lote[];
  loading?: boolean;
}

export const ListadoLotes = ({ lotes = [], loading = false }: ListadoLotesProps) => {
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);

  // Asegura que siempre sea un array válido
  const listaLotes = Array.isArray(lotes) ? lotes : [];

  return (
    <Box mt={8} p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <Heading size="lg" mb={4} color="gray.700" display="flex" alignItems="center" gap={2}>
        <FiList /> Historial de Lotes Producidos
      </Heading>

      {loading ? (
        <Text color="gray.500">Cargando lotes...</Text>
      ) : listaLotes.length === 0 ? (
        <Text color="gray.500">No hay lotes registrados todavía.</Text>
      ) : (
        <Table.Root variant="line" size="md">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ID Lote</Table.ColumnHeader>
              <Table.ColumnHeader>Producto</Table.ColumnHeader>
              <Table.ColumnHeader>Fecha de Producción</Table.ColumnHeader>
              <Table.ColumnHeader>Cantidad Producida</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {listaLotes.map((lote) => (
              <Table.Row key={lote?.id ?? Math.random()}>
                <Table.Cell>
                  <Badge colorPalette="green">#{lote?.id ?? "—"}</Badge>
                </Table.Cell>
                <Table.Cell fontWeight="semibold">
                  {lote?.producto?.nombre ?? `ID: ${lote?.producto_id ?? "—"}`}
                </Table.Cell>
                <Table.Cell>{lote?.fecha ?? "—"}</Table.Cell>
                <Table.Cell fontWeight="bold">{lote?.cantidad ?? 0}</Table.Cell>
                <Table.Cell textAlign="right">
                  <IconButton
                    aria-label="Ver detalle del lote"
                    size="sm"
                    variant="ghost"
                    colorPalette="blue"
                    onClick={() => setLoteSeleccionado(lote)}
                  >
                    <FiEye />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {loteSeleccionado && (
        <LoteDetalle
          lote={loteSeleccionado}
          onCerrar={() => setLoteSeleccionado(null)}
        />
      )}
    </Box>
  );
};