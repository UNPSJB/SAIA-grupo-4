import { Box, Text, VStack } from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { GraficoConfig, TamanoFijo } from "./types";
import { getChartColor } from "./utils/chartColors";
import { SegmentedBar } from "./SegmentedBar";
import { GraficoCard } from "./GraficoCard";
import { ContenedorGrafico } from "./ContenedorGrafico";

interface DashboardChartProps {
  title: string;
  config: GraficoConfig;
  metricKey: string;
  /**
   * Modo impresión: dibuja el gráfico con este tamaño exacto, sin animaciones,
   * sin tooltip y sin botón de descarga. Sin esta prop se comporta como siempre.
   */
  fixedSize?: TamanoFijo;
}

// Props comunes de cada variante de gráfico
interface VistaGraficoProps {
  title: string;
  config: GraficoConfig;
  fixedSize?: TamanoFijo;
}

const USE_SEGMENTED_BAR = new Set([
  "vencimientos",
  "vencimientos_equipos",
  "vencimientos_personal",
  "vencimientos_documentos",
  "vencimientos_elementos_limpieza",
  "incidentes",
]);

const USE_BAR_CHART = new Set(["lotes"]);

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <Box
      bg='white'
      p={2}
      borderRadius='md'
      shadow='md'
      border='1px solid'
      borderColor='gray.200'
    >
      <Text fontSize='xs' fontWeight='medium'>
        {data.name}
      </Text>
      <Text fontSize='xs' color='gray.600'>
        {data.value}
      </Text>
    </Box>
  );
};

// Sin datos: solo se muestra el mensaje, sin leyendas.
const EmptyChart = ({
  title,
  impresion,
}: {
  title: string;
  impresion: boolean;
}) => (
  <GraficoCard title={title} descargable={false} impresion={impresion}>
    <VStack py={8} gap={4}>
      <Text color='gray.500' fontSize='sm'>
        Sin datos para mostrar
      </Text>
    </VStack>
  </GraficoCard>
);

const PieChartView = ({ title, config, fixedSize }: VistaGraficoProps) => {
  const data = config.datos.map((item, index) => ({
    name: item.label,
    value: item.valor,
    color: getChartColor(item.label, index),
  }));

  // En impresión el radio se ajusta al tamaño fijo para que la torta no se corte
  const radio = fixedSize
    ? Math.min(fixedSize.width, fixedSize.height) / 2 - 10
    : 110;

  return (
    <GraficoCard title={title} impresion={!!fixedSize}>
      <ContenedorGrafico altoPantalla={300} fixedSize={fixedSize}>
        <PieChart>
          <Pie
            data={data}
            cx='50%'
            cy='50%'
            outerRadius={radio}
            dataKey='value'
            labelLine={false}
            isAnimationActive={!fixedSize}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {!fixedSize && <Tooltip content={<PieTooltip />} />}
        </PieChart>
      </ContenedorGrafico>
      <VStack align='start' gap={2} mt={2}>
        {config.leyendas.map((leyenda, idx) => {
          const dato = config.datos[idx];
          const color = dato ? getChartColor(dato.label, idx) : "#A0AEC0";
          return (
            <Box key={idx} display='flex' alignItems='center' gap={2}>
              <Box w={3} h={3} borderRadius='full' bg={color} />
              <Text fontSize='xs' color='gray.600'>
                {leyenda.label}
              </Text>
            </Box>
          );
        })}
      </VStack>
    </GraficoCard>
  );
};

const SegmentedBarChart = ({ title, config, fixedSize }: VistaGraficoProps) => {
  const segmentos = config.datos.map((dato) => ({
    label: dato.label,
    valor: dato.valor,
  }));
  const total = segmentos.reduce((sum, seg) => sum + seg.valor, 0);

  return (
    <GraficoCard title={title} impresion={!!fixedSize}>
      <VStack align='stretch' gap={4}>
        <Text fontSize='xs' color='gray.500' fontWeight='medium'>
          Total: {total}
        </Text>
        <SegmentedBar
          segmentos={segmentos}
          mostrarLeyenda={true}
          fixedSize={fixedSize}
        />
      </VStack>
    </GraficoCard>
  );
};

const FallbackBarChart = ({ title, config, fixedSize }: VistaGraficoProps) => {
  const total = config.datos.reduce((sum, item) => sum + item.valor, 0);
  return (
    <GraficoCard title={title} impresion={!!fixedSize}>
      <VStack align='stretch' gap={4}>
        <Text fontSize='xs' color='gray.500' fontWeight='medium'>
          Total: {total}
        </Text>
        {config.datos.map((dato, idx) => {
          const porcentaje = total > 0 ? (dato.valor / total) * 100 : 0;
          const color = getChartColor(dato.label, idx);
          return (
            <Box key={idx}>
              <Box display='flex' justifyContent='space-between' mb={1}>
                <Text fontSize='xs' color='gray.600'>
                  {dato.label}
                </Text>
                <Text fontSize='xs' fontWeight='medium'>
                  {dato.valor} ({porcentaje.toFixed(1)}%)
                </Text>
              </Box>
              <Box
                h='8px'
                bg='gray.100'
                borderRadius='full'
                overflow='hidden'
              >
                <Box h='full' bg={color} w={`${porcentaje}%`} />
              </Box>
            </Box>
          );
        })}
      </VStack>
    </GraficoCard>
  );
};

// En el informe impreso el gráfico de lotes ocupa media hoja: con más productos
// que esto los nombres se pisan, así que el resto se agrupa en una barra "Otros".
const MAX_BARRAS_IMPRESION = 10;
const COLOR_OTROS = "#A0AEC0";

interface BarraDato {
  name: string;
  fullName: string;
  value: number;
  color: string;
}

/**
 * Deja las `max` barras de mayor valor (en su orden original) y suma el resto
 * en una barra final "Otros (N)". Si no hay más de `max`, devuelve los datos tal cual.
 */
const agruparResto = (datos: BarraDato[], max: number): BarraDato[] => {
  if (datos.length <= max) return datos;

  const principales = new Set(
    [...datos]
      .map((dato, indice) => ({ dato, indice }))
      .sort((a, b) => b.dato.value - a.dato.value)
      .slice(0, max)
      .map(({ indice }) => indice),
  );
  const resto = datos.filter((_, indice) => !principales.has(indice));

  return [
    // Los colores se reasignan según la posición final, así las 10 barras no repiten color
    ...datos
      .filter((_, indice) => principales.has(indice))
      .map((dato, indice) => ({
        ...dato,
        color: getChartColor(dato.fullName, indice),
      })),
    {
      name: `Otros (${resto.length})`,
      fullName: `Otros: ${resto.map((dato) => dato.fullName).join(", ")}`,
      value: resto.reduce((suma, dato) => suma + dato.value, 0),
      color: COLOR_OTROS,
    },
  ];
};

const BarChartView = ({
  title,
  config,
  metricKey,
  fixedSize,
}: VistaGraficoProps & { metricKey?: string }) => {
  const isLotes = metricKey === "lotes";
  const data: BarraDato[] = config.datos.map((item, index) => {
    const fullLabel = item.label;
    const match = fullLabel.match(/^([^(]+)\s*\(/);
    const productName = match ? match[1].trim() : fullLabel;
    return {
      name:
        productName.length > 15
          ? productName.substring(0, 12) + "..."
          : productName,
      fullName: fullLabel,
      value: item.valor,
      color: getChartColor(item.label, index),
    };
  });

  // En el informe impreso, con muchos productos el resto se agrupa en "Otros"
  const datosImpresion = agruparResto(data, MAX_BARRAS_IMPRESION);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <Box
          bg='white'
          p={2}
          borderRadius='md'
          shadow='md'
          border='1px solid'
          borderColor='gray.200'
        >
          <Text fontSize='xs' fontWeight='medium'>
            {item.fullName}
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <GraficoCard title={title} impresion={!!fixedSize}>
      {fixedSize ? (
        // Impresión: barras verticales como en pantalla, con los nombres más
        // inclinados y margen a la izquierda para que entren en media hoja A4
        <ContenedorGrafico altoPantalla={280} fixedSize={fixedSize}>
          <BarChart
            data={datosImpresion}
            margin={{ top: 5, right: 10, left: 15, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray='3 3' stroke='#E2E8F0' />
            <XAxis
              dataKey='name'
              angle={-40}
              textAnchor='end'
              interval={0}
              height={65}
            />
            <YAxis width={35} />
            <Bar
              dataKey='value'
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {datosImpresion.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ContenedorGrafico>
      ) : (
        <ContenedorGrafico altoPantalla={280}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray='3 3' stroke='#E2E8F0' />
            <XAxis
              dataKey='name'
              tick={{ fontSize: 9 }}
              angle={-25}
              textAnchor='end'
              interval={0}
              height={60}
            />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey='value' radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ContenedorGrafico>
      )}
      {!isLotes && (
        <VStack align='start' gap={2} mt={2}>
          {config.leyendas.map((leyenda, idx) => {
            const dato = config.datos[idx];
            const color = dato ? getChartColor(dato.label, idx) : "#A0AEC0";
            return (
              <Box key={idx} display='flex' alignItems='center' gap={2}>
                <Box
                  w={3}
                  h={3}
                  borderRadius='full'
                  bg={color}
                  flexShrink={0}
                />
                <Text fontSize='xs' color='gray.600'>
                  {leyenda.label}
                </Text>
              </Box>
            );
          })}
        </VStack>
      )}
    </GraficoCard>
  );
};

export function DashboardChart({
  title,
  config,
  metricKey,
  fixedSize,
}: DashboardChartProps) {
  if (!config.datos || config.datos.length === 0) {
    return <EmptyChart title={title} impresion={!!fixedSize} />;
  }

  if (USE_BAR_CHART.has(metricKey)) {
    return (
      <BarChartView
        title={title}
        config={config}
        metricKey={metricKey}
        fixedSize={fixedSize}
      />
    );
  }

  if (metricKey === "tareas") {
    return <PieChartView title={title} config={config} fixedSize={fixedSize} />;
  }

  if (USE_SEGMENTED_BAR.has(metricKey)) {
    return (
      <SegmentedBarChart title={title} config={config} fixedSize={fixedSize} />
    );
  }

  return (
    <FallbackBarChart title={title} config={config} fixedSize={fixedSize} />
  );
}
