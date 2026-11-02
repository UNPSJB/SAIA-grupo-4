import { useState } from "react";
import {
  Box, Heading, HStack, Input, Button, Text, VStack
} from "@chakra-ui/react";
import { FiBarChart2, FiFilter, FiRefreshCw } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useListadoData } from "../../hooks/useListadoData";
import { LoadingState, AlertMessage } from "../../components/ui";
import { ListadoLotes } from "./ListadoLotes";

interface EstadisticaProducto {
  producto_id: number;
  producto_nombre: string;
  cantidad_total: number;
}

export const EstadisticasProduccion = () => {
  const [desdeInput, setDesdeInput] = useState<string>("");
  const [hastaInput, setHastaInput] = useState<string>("");
  const [filtros, setFiltros] = useState({ desde: "", hasta: "" });

  const [productoSeleccionado, setProductoSeleccionado] = useState<{id: string, nombre: string} | null>(null);

  const endpoint = filtros.desde || filtros.hasta
    ? `/lotes/estadisticas?desde=${filtros.desde}&hasta=${filtros.hasta}`
    : "/lotes/estadisticas";

  const { data, loading, error, reload } = useListadoData<EstadisticaProducto>({
    endpoint,
    errorMessage: "No se pudieron cargar las estadísticas de producción.",
  });

  const handleAplicarFiltros = () => {
    setProductoSeleccionado(null); // Reseteamos la tabla de abajo si cambiamos fechas
    setFiltros({ desde: desdeInput, hasta: hastaInput });
  };

  const handleLimpiarFiltros = () => {
    setDesdeInput("");
    setHastaInput("");
    setProductoSeleccionado(null);
    setFiltros({ desde: "", hasta: "" });
    reload();
  };

  const handleClickBarra = (dataObj: any) => {
    if (dataObj && dataObj.producto_id) {
      setProductoSeleccionado({
        id: String(dataObj.producto_id),
        nombre: dataObj.producto_nombre
      });
    }
  };

  const chartData = Array.isArray(data) ? data : [];

  return (
    <VStack gap={6} align="stretch" w="100%">
      <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md" bg="white">
        <Heading size="lg" mb={6} color="gray.700" display="flex" alignItems="center" gap={2}>
          <FiBarChart2 /> Producción por Producto
        </Heading>

        {/* Filtros de Fecha */}
        <Box mb={6} p={4} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
          <HStack gap={4} flexWrap="wrap" align="flex-end">
            <Box minW="150px">
              <Text fontSize="sm" fontFamily="sans-serif" mb={1.5}>Desde</Text>
              <Input type="date" bg="white" value={desdeInput} onChange={(e) => setDesdeInput(e.target.value)} />
            </Box>
            <Box minW="150px">
              <Text fontSize="sm" fontFamily="sans-serif" mb={1.5}>Hasta</Text>
              <Input type="date" bg="white" value={hastaInput} onChange={(e) => setHastaInput(e.target.value)} />
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

        {/* Gráfico */}
        {loading ? (
          <LoadingState message="Cargando estadísticas..." />
        ) : error ? (
          <AlertMessage type="error" message={error} />
        ) : chartData.length === 0 ? (
          <AlertMessage type="info" message="No hay producción registrada en este período." />
        ) : (
          <Box h="400px" w="100%">
            <Text fontSize="sm" color="gray.500" mb={4} fontStyle="italic">
              * Hacé clic en una barra para ver el detalle de los lotes de ese producto.
            </Text>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="producto_nombre" stroke="#4A5568" fontSize={12} />
                <YAxis stroke="#4A5568" fontSize={12} />
                <Tooltip 
                  cursor={{ fill: '#F7FAFC' }} 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
                <Bar 
                  dataKey="cantidad_total" 
                  name="Cantidad Total" 
                  fill="#38A169" 
                  radius={[4, 4, 0, 0]}
                  onClick={handleClickBarra}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      {/* Detalle incrustado reutilizando ListadoLotes */}
      {productoSeleccionado && (
        <Box>
          <Text fontSize="lg" fontWeight="bold" color="green.700" mb={-4} zIndex={1} position="relative" ml={6}>
            Desglose de lotes: {productoSeleccionado.nombre}
          </Text>
          <ListadoLotes 
            key={`${productoSeleccionado.id}-${filtros.desde}-${filtros.hasta}`}
            ocultarFiltros={true} 
            defaultProductoId={productoSeleccionado.id}
            defaultDesde={filtros.desde}
            defaultHasta={filtros.hasta}
          />
        </Box>
      )}
    </VStack>
  );
};