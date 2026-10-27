import { Box, Container, Grid, HStack, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { FiBarChart2 } from "react-icons/fi";
import { useDashboard } from "../features/dashboard/hooks/useDashboard";
import { MetricCard } from "../features/dashboard/MetricCard";
import { DashboardChart } from "../features/dashboard/DashboardChart";
import { DashboardFilters } from "../features/dashboard/DashboardFilters";
import { GroupedStackedBar } from "../features/dashboard/GroupedStackedBar";
import { LoadingState, AlertMessage } from "../components/ui";
import type { DashboardResponse } from "../features/dashboard/types";

// Mapea claves de gráfico a títulos descriptivos
const getChartTitle = (key: string): string => {
  const titleMap: Record<string, string> = {
    vencimientos_equipos: "Vencimientos - Calibraciones de equipos",
    vencimientos_personal: "Vencimientos - Documentación del personal",
    vencimientos_documentos: "Vencimientos - Documentos",
    vencimientos_elementos_limpieza: "Vencimientos - Elementos de limpieza",
    vencimientos: "Vencimientos que requieren atención",
    incidentes: "Incidentes cerrados",
    tareas: "Cumplimiento de tareas",
    lotes: "Lotes producidos",
  };
  return titleMap[key] || key;
};

const VENCIMIENTO_KEYS = [
  "vencimientos_equipos",
  "vencimientos_personal",
  "vencimientos_documentos",
  "vencimientos_elementos_limpieza",
] as const;

const VENCIMIENTO_CATEGORIAS = [
  { key: "vencimientos_equipos", label: "Equipos" },
  { key: "vencimientos_personal", label: "Doc. personal" },
  { key: "vencimientos_documentos", label: "Documentos" },
  { key: "vencimientos_elementos_limpieza", label: "Elem. limpieza" },
] as const;

const calcularVencimientosTotales = (data: DashboardResponse) => {
  let totalVenc = 0;
  let requieren = 0;

  VENCIMIENTO_KEYS.forEach((k) => {
    const g = data.graficos[k];
    if (g?.datos) {
      g.datos.forEach((d) => {
        totalVenc += d.valor;
        const l = d.label.toLowerCase();
        if (
          l.includes("vencido") ||
          l.includes("próximo") ||
          l.includes("proximo")
        ) {
          requieren += d.valor;
        }
      });
    }
  });

  const pct =
    totalVenc > 0 ? Math.round((requieren / totalVenc) * 100 * 10) / 10 : 0;
  return { pct, requieren, totalVenc };
};

const construirDatosVencimientosAgrupados = (data: DashboardResponse) => {
  return VENCIMIENTO_CATEGORIAS.map((cat) => {
    const graf = data.graficos[cat.key];
    const result: Record<string, string | number> & { categoria: string } = {
      categoria: cat.label,
    };
    if (graf?.datos) {
      graf.datos.forEach((d) => {
        const label = d.label.toLowerCase();
        if (label.includes("vigente")) result["Vigentes"] = d.valor;
        else if (label.includes("próximo") || label.includes("proximo"))
          result["Próximos a vencer"] = d.valor;
        else if (label.includes("vencido")) result["Vencidos"] = d.valor;
        else result[d.label] = d.valor;
      });
    }
    return result;
  });
};

const construirDatosIncidentesAgrupados = (data: DashboardResponse) => {
  const grafInc = data.graficos["incidentes"];
  if (!grafInc?.datos || grafInc.datos.length === 0) return null;

  const tiposMap = new Map<string, { abiertos: number; cerrados: number }>();
  grafInc.datos.forEach((d) => {
    const label = d.label;
    if (label.includes(" - Abiertos")) {
      const tipo = label.replace(" - Abiertos", "");
      if (!tiposMap.has(tipo)) tiposMap.set(tipo, { abiertos: 0, cerrados: 0 });
      tiposMap.get(tipo)!.abiertos = d.valor;
    } else if (label.includes(" - Cerrados")) {
      const tipo = label.replace(" - Cerrados", "");
      if (!tiposMap.has(tipo)) tiposMap.set(tipo, { abiertos: 0, cerrados: 0 });
      tiposMap.get(tipo)!.cerrados = d.valor;
    }
  });

  if (tiposMap.size > 0) {
    return Array.from(tiposMap.entries()).map(([tipo, vals]) => ({
      categoria: tipo.length > 20 ? tipo.substring(0, 18) + "..." : tipo,
      Abiertos: vals.abiertos,
      Cerrados: vals.cerrados,
    }));
  }

  return [
    {
      categoria: "Incidentes",
      Abiertos:
        grafInc.datos.find((d) => d.label.toLowerCase().includes("abierto"))
          ?.valor || 0,
      Cerrados:
        grafInc.datos.find((d) => d.label.toLowerCase().includes("cerrado"))
          ?.valor || 0,
    },
  ];
};

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

  const hasVencimientos = data
    ? VENCIMIENTO_KEYS.some((k) => data.graficos[k])
    : false;
  const vencimientosTotales = data ? calcularVencimientosTotales(data) : null;
  const datosVencimientosAgrupados =
    data && hasVencimientos ? construirDatosVencimientosAgrupados(data) : null;
  const datosIncidentesAgrupados = data
    ? construirDatosIncidentesAgrupados(data)
    : null;
  const tieneIncidentesAgrupados =
    datosIncidentesAgrupados && datosIncidentesAgrupados.length > 0;

  const graficosAdicionales = data
    ? Object.entries(data.graficos).filter(
        ([key]) =>
          !key.startsWith("vencimientos_") &&
          key !== "vencimientos" &&
          key !== "incidentes",
      )
    : [];

  return (
    <Box bg='gray.50' minH='100vh'>
      <Box py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
        <Container maxW='container.xl' px={0}>
          <VStack align='stretch' gap={6}>
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

                  {data.tarjetas
                    .filter((t) => !t.key.startsWith("vencimientos_"))
                    .map((tarjeta) => (
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
                      keys={["Vigentes", "Próximos a vencer", "Vencidos"]}
                      keyLabels={{
                        Vigentes: "Vigentes",
                        "Próximos a vencer": "Próximos",
                        Vencidos: "Vencidos",
                      }}
                    />
                  )}

                  {tieneIncidentesAgrupados && (
                    <GroupedStackedBar
                      key='incidentes-agrupados'
                      title='Incidentes por tipo'
                      data={datosIncidentesAgrupados}
                      keys={["Abiertos", "Cerrados"]}
                      keyLabels={{ Abiertos: "Abiertos", Cerrados: "Cerrados" }}
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
                </Grid>
              </>
            )}
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
