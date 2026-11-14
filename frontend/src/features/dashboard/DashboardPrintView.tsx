import { Grid, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { InformePrintLayout } from "../../components/print/InformePrintLayout";
import { DashboardChart } from "./DashboardChart";
import { GroupedStackedBar } from "./GroupedStackedBar";
import { MetricCard } from "./MetricCard";
import type { DashboardResponse, TamanoFijo } from "./types";
import {
  getChartTitle,
  INCIDENTES_KEYS_GRAFICO,
  INCIDENTES_LABELS_GRAFICO,
  prepararDashboard,
  textoPeriodo,
  VENCIMIENTOS_KEYS_GRAFICO,
  VENCIMIENTOS_LABELS_GRAFICO,
} from "./utils/datosDashboard";

// Tamaño de cada gráfico en la hoja A4 (dos por fila)
const TAMANO_GRAFICO: TamanoFijo = { width: 290, height: 210 };

const TituloSeccion = ({ children }: { children: ReactNode }) => (
  <Text
    fontSize="sm"
    fontWeight="bold"
    color="green.800"
    borderBottomWidth="1px"
    borderColor="gray.300"
    pb={1}
    mb={3}
  >
    {children}
  </Text>
);

interface DashboardPrintViewProps {
  /** Los mismos datos que se muestran en pantalla (respuesta de GET /dashboard). */
  data: DashboardResponse;
}

/**
 * Informe imprimible del dashboard.
 *
 * Está oculto en pantalla y solo aparece al imprimir (lo maneja InformePrintLayout).
 * Recibe los datos ya cargados por la pantalla y los prepara con las mismas funciones
 * que DashboardPage, así el informe muestra exactamente lo mismo que se ve.
 */
export function DashboardPrintView({ data }: DashboardPrintViewProps) {
  const {
    vencimientosTotales,
    tarjetas,
    datosVencimientosAgrupados,
    datosIncidentesAgrupados,
    tieneGraficoIncidentes,
    graficosAdicionales,
  } = prepararDashboard(data);

  return (
    <InformePrintLayout
      titulo="Dashboard Consolidado"
      periodo={textoPeriodo(data.desde, data.hasta)}
    >
      <VStack align="stretch" gap={5}>
        {/* Tarjetas de métricas, sin links ni hover */}
        <section>
          <TituloSeccion>Indicadores</TituloSeccion>
          <Grid templateColumns="repeat(4, 1fr)" gap={3}>
            <MetricCard
              estatica
              metricKey="vencimientos"
              titulo="Vencimientos totales"
              valor={vencimientosTotales.pct}
              unidad="porcentaje"
              detalle={`${vencimientosTotales.requieren} de ${vencimientosTotales.totalVenc} ítems requieren atención`}
            />
            {tarjetas.map((tarjeta) => (
              <MetricCard
                estatica
                key={tarjeta.key}
                metricKey={tarjeta.key}
                titulo={tarjeta.titulo}
                valor={tarjeta.valor}
                unidad={tarjeta.unidad}
                detalle={tarjeta.detalle}
              />
            ))}
          </Grid>
          <Text fontSize="2xs" color="gray.500" mt={2}>
            Los vencimientos muestran el estado al día de hoy y no dependen del
            período seleccionado.
          </Text>
        </section>

        {/* Gráficos en modo impresión: tamaño fijo y sin animaciones */}
        <section>
          <TituloSeccion>Gráficos</TituloSeccion>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            {datosVencimientosAgrupados && (
              <GroupedStackedBar
                title="Vencimientos por tipo"
                data={datosVencimientosAgrupados}
                keys={VENCIMIENTOS_KEYS_GRAFICO}
                keyLabels={VENCIMIENTOS_LABELS_GRAFICO}
                fixedSize={TAMANO_GRAFICO}
              />
            )}
            {graficosAdicionales.map(([key, config]) => (
              <DashboardChart
                key={key}
                title={getChartTitle(key)}
                config={config}
                metricKey={key}
                fixedSize={TAMANO_GRAFICO}
              />
            ))}
            {tieneGraficoIncidentes && (
              <GroupedStackedBar
                title="Incidentes por tipo"
                data={datosIncidentesAgrupados ?? []}
                keys={INCIDENTES_KEYS_GRAFICO}
                keyLabels={INCIDENTES_LABELS_GRAFICO}
                fixedSize={TAMANO_GRAFICO}
              />
            )}
          </Grid>
        </section>
      </VStack>
    </InformePrintLayout>
  );
}
