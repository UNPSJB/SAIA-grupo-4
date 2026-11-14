import { Box, Button, Container, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { FiBarChart2, FiPrinter } from "react-icons/fi";
import { useDashboard } from "../features/dashboard/hooks/useDashboard";
import { MetricCard } from "../features/dashboard/MetricCard";
import { DashboardChart } from "../features/dashboard/DashboardChart";
import { DashboardFilters } from "../features/dashboard/DashboardFilters";
import { GroupedStackedBar } from "../features/dashboard/GroupedStackedBar";
import { DashboardPrintView } from "../features/dashboard/DashboardPrintView";
import { imprimirInforme } from "../utils/imprimirInforme";
import { LoadingState, AlertMessage } from "../components/ui";
import {
  getChartTitle,
  INCIDENTES_KEYS_GRAFICO,
  INCIDENTES_LABELS_GRAFICO,
  nombreArchivoDashboard,
  prepararDashboard,
  VENCIMIENTOS_KEYS_GRAFICO,
  VENCIMIENTOS_LABELS_GRAFICO,
} from "../features/dashboard/utils/datosDashboard";

export default function DashboardPage() {
  const [filters, setFilters] = useState<{ desde?: string; hasta?: string }>(
    {},
  );
  const { data, loading, error } = useDashboard(filters);

  const handleFilterChange = (desde?: string, hasta?: string) => {
    setFilters({ desde, hasta });
  };

  if (loading && !data) {
    return <LoadingState message='Cargando dashboard...' />;
  }

  if (error) {
    return (
      <Container maxW='container.xl' py={6}>
        <AlertMessage type='error' message={error} />
      </Container>
    );
  }

  // Mismos cálculos que usa el informe imprimible (DashboardPrintView)
  const preparado = data ? prepararDashboard(data) : null;
  const vencimientosTotales = preparado?.vencimientosTotales ?? null;
  const datosVencimientosAgrupados = preparado?.datosVencimientosAgrupados ?? null;
  const datosIncidentesAgrupados = preparado?.datosIncidentesAgrupados ?? null;
  const tieneGraficoIncidentes = preparado?.tieneGraficoIncidentes ?? false;
  const graficosAdicionales = preparado?.graficosAdicionales ?? [];

  return (
    <Box bg='gray.50' minH='100vh'>
      <Box py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
        <Container maxW='container.xl' px={0}>
          <VStack align='stretch' gap={6}>
            <HStack
              justify='space-between'
              align='flex-start'
              gap={3}
              flexWrap='wrap'
            >
              <Box>
                <HStack gap={2} mb={1}>
                  <FiBarChart2 color='#2F855A' size={20} />
                  <Text
                    fontSize={{ base: "lg", md: "xl" }}
                    fontWeight='extrabold'
                    color='gray.800'
                  >
                    Dashboard Consolidado
                  </Text>
                </HStack>
                <Text fontSize='xs' color='gray.500'>
                  Métricas generales del sistema con indicadores clave de gestión
                </Text>
              </Box>

              {data && (
                <Button
                  size='sm'
                  onClick={() => imprimirInforme(nombreArchivoDashboard(data))}
                  // Mientras se aplica un filtro, el informe todavía tiene los datos anteriores
                  disabled={loading}
                  variant='outline'
                  colorPalette='blue'
                  bg='white'
                  transition='all 0.15s ease'
                  _hover={{
                    bg: "blue.50",
                    borderColor: "blue.500",
                    color: "blue.700",
                    shadow: "sm",
                  }}
                >
                  <FiPrinter /> Imprimir / Descargar PDF
                </Button>
              )}
            </HStack>

            <DashboardFilters
              onFilterChange={handleFilterChange}
              initialDesde={filters.desde}
              initialHasta={filters.hasta}
            />

            {data && vencimientosTotales && (
              <>
                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "repeat(2, 1fr)",
                    lg: "repeat(5, 1fr)",
                  }}
                  gap={4}
                >
                  <MetricCard
                    key='vencimientos_total'
                    metricKey='vencimientos'
                    titulo='Vencimientos totales'
                    valor={vencimientosTotales.pct}
                    unidad='porcentaje'
                    detalle={`${vencimientosTotales.requieren} de ${vencimientosTotales.totalVenc} ítems requieren atención`}
                    link='/vencimientos'
                  />

                  {preparado?.tarjetas.map((tarjeta) => (
                    <MetricCard
                      key={tarjeta.key}
                      metricKey={tarjeta.key}
                      titulo={tarjeta.titulo}
                      valor={tarjeta.valor}
                      unidad={tarjeta.unidad}
                      detalle={tarjeta.detalle}
                      link={tarjeta.link}
                    />
                  ))}
                </Grid>

                <Grid
                  templateColumns={{ base: "1fr", xl: "repeat(2, 1fr)" }}
                  gap={6}
                >
                  {datosVencimientosAgrupados && (
                    <GroupedStackedBar
                      key='vencimientos-agrupados'
                      title='Vencimientos por tipo'
                      data={datosVencimientosAgrupados}
                      keys={VENCIMIENTOS_KEYS_GRAFICO}
                      keyLabels={VENCIMIENTOS_LABELS_GRAFICO}
                    />
                  )}
                  {graficosAdicionales.map(([key, config]) => (
                    <DashboardChart
                      key={key}
                      title={getChartTitle(key)}
                      config={config}
                      metricKey={key}
                    />
                  ))}

                  {tieneGraficoIncidentes && (
                    <GroupedStackedBar
                      key='incidentes-agrupados'
                      title='Incidentes por tipo'
                      data={datosIncidentesAgrupados ?? []}
                      keys={INCIDENTES_KEYS_GRAFICO}
                      keyLabels={INCIDENTES_LABELS_GRAFICO}
                    />
                  )}
                </Grid>
              </>
            )}
          </VStack>
        </Container>
      </Box>

      {/* Informe imprimible: oculto en pantalla, solo aparece al imprimir */}
      {data && <DashboardPrintView data={data} />}
    </Box>
  );
}
