import { useState, useMemo } from "react";
import {
  Box,
  Heading,
  Table,
  Badge,
  IconButton,
  Text,
  HStack,
  Input,
  Button,
} from "@chakra-ui/react";
import { FiEye, FiList, FiFilter, FiRefreshCw } from "react-icons/fi";
import { useListadoData } from "../../hooks/useListadoData";
import { ITEMS_POR_PAGINA, ITEMS_SELECT } from "../../config";
import { TablePagination, LoadingState, AlertMessage, SelectField } from "../../components/ui";
import type { Lote } from "./types";
import type { Producto } from "../productos/types";
import { LoteDetalle } from "./LoteDetalle";

interface ListadoLotesProps {
  refreshKey?: number;
  ocultarFiltros?: boolean;
  defaultProductoId?: string;
  defaultDesde?: string;
  defaultHasta?: string;
}

export const ListadoLotes = ({ refreshKey = 0, ocultarFiltros = false, defaultProductoId, defaultDesde, defaultHasta }: ListadoLotesProps) => {
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);

  const [productoInput, setProductoInput] = useState<string>(defaultProductoId || "");
  const [desdeInput, setDesdeInput] = useState<string>(defaultDesde || "");
  const [hastaInput, setHastaInput] = useState<string>(defaultHasta || "");

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    producto_id: "",
    desde: "",
    hasta: "",
  });

  const [page, setPage] = useState(1);

  const { data: productos } = useListadoData<Producto>({
    endpoint: "/productos/",
    pageSize: ITEMS_SELECT,
    errorMessage: "No se pudieron cargar los productos para el filtro.",
  });

  const endpointLotes = useMemo(() => {
    const params = new URLSearchParams();
    if (filtrosAplicados.producto_id) params.set("producto_id", filtrosAplicados.producto_id);
    if (filtrosAplicados.desde) params.set("desde", filtrosAplicados.desde);
    if (filtrosAplicados.hasta) params.set("hasta", filtrosAplicados.hasta);
    
    const qs = params.toString();
    return qs ? `/lotes/?${qs}` : "/lotes/";
  }, [filtrosAplicados, refreshKey]);

  const {
    data: lotes,
    loading,
    error,
    reload,
  } = useListadoData<Lote>({
    endpoint: endpointLotes,
    errorMessage: "No se pudo cargar el historial de lotes.",
  });

  const handleAplicarFiltros = () => {
    setPage(1);
    setFiltrosAplicados({
      producto_id: productoInput,
      desde: desdeInput,
      hasta: hastaInput,
    });
  };

  const handleLimpiarFiltros = () => {
    setProductoInput("");
    setDesdeInput("");
    setHastaInput("");
    setPage(1);
    setFiltrosAplicados({ producto_id: "", desde: "", hasta: "" });
    reload();
  };

  const opcionesProductos = Array.isArray(productos) 
    ? [{ label: "Todos los productos", value: "" }, ...productos.map(p => ({ label: p.nombre, value: String(p.id) }))]
    : [{ label: "Todos los productos", value: "" }];

  const listaLotes = Array.isArray(lotes) ? lotes : [];
  const inicio = (page - 1) * ITEMS_POR_PAGINA;
  const lotesPaginados = listaLotes.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <Box mt={8} p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
      <Heading size="lg" mb={4} color="gray.700" display="flex" alignItems="center" gap={2}>
        <FiList /> Historial de Lotes Producidos
      </Heading>
    
      {/* Barra de Filtros */}
      {!ocultarFiltros && (
      <Box mb={6} p={4} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
        <HStack gap={4} flexWrap="wrap" align="flex-end">
          <Box minW="220px" flex="1">
            <SelectField
              label="Producto"
              options={opcionesProductos}
              value={productoInput}
              onChange={(e) => setProductoInput(e.target.value)}
            />
          </Box>

          <Box minW="150px">
            <Text fontSize="sm" fontFamily="sans-serif" mb={1.5}>Desde</Text>
            <Input
              type="date"
              bg="white"
              value={desdeInput}
              max={hastaInput || undefined}
              onChange={(e) => setDesdeInput(e.target.value)}
            />
          </Box>

          <Box minW="150px">
            <Text fontSize="sm" fontFamily="sans-serif" mb={1.5}>Hasta</Text>
            <Input
              type="date"
              bg="white"
              value={hastaInput}
              min={desdeInput || undefined}
              onChange={(e) => setHastaInput(e.target.value)}
            />
          </Box>

          <HStack gap={2}>
            <Button colorPalette="green" onClick={handleAplicarFiltros}>
              <FiFilter /> Filtrar
            </Button>
            <Button variant="outline" onClick={handleLimpiarFiltros}>
              <FiRefreshCw /> Limpiar
            </Button>
          </HStack>
        </HStack>
      </Box>
      )}

      {/* Contenido */}
      {loading ? (
        <LoadingState message="Cargando historial de lotes..." />
      ) : error ? (
        <AlertMessage type="error" message={error} />
      ) : listaLotes.length === 0 ? (
        <AlertMessage type="info" message="No se encontraron lotes con los filtros seleccionados." />
      ) : (
        <>
          <Table.Root variant="line" size="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>ID Lote</Table.ColumnHeader>
                <Table.ColumnHeader>Producto</Table.ColumnHeader>
                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                <Table.ColumnHeader>Cantidad Producida</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {lotesPaginados.map((lote) => (
                <Table.Row key={lote.id}>
                  <Table.Cell>
                    <Badge colorPalette="green">#{lote.id}</Badge>
                  </Table.Cell>
                  <Table.Cell fontWeight="semibold">
                    {lote.producto?.nombre ?? `ID: ${lote.producto_id}`}
                  </Table.Cell>
                  <Table.Cell>{lote.fecha}</Table.Cell>
                  <Table.Cell fontWeight="bold">{lote.cantidad}</Table.Cell>
                  <Table.Cell textAlign="right">
                    <IconButton
                      aria-label="Ver detalle"
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

          <TablePagination
            count={listaLotes.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular="lote"
            labelPlural="lotes"
          />
        </>
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