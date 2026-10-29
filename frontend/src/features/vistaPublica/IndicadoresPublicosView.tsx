import {
  Box,
  Card,
  Grid,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { MetricCard } from "../dashboard/MetricCard";
import { SegmentedBar } from "../dashboard/SegmentedBar";
import { GroupedStackedBar } from "../dashboard/GroupedStackedBar";
import type { IndicadoresPublicos } from "./types";

const CLAVES_VENCIMIENTOS = ["Vigentes", "Próximos a vencer", "Vencidos"];

const ETIQUETAS_VENCIMIENTOS: Record<string, string> = {
  Vigentes: "Vigentes",
  "Próximos a vencer": "Próximos a vencer",
  Vencidos: "Vencidos",
};

function VencimientoStat({
  label,
  valor,
  color,
}: {
  label: string;
  valor: number;
  color: string;
}) {
  return (
    <Box>
      <Text fontSize='xs' color='gray.500' fontWeight='medium'>
        {label}
      </Text>
      <Text fontSize='2xl' fontWeight='bold' color={color} lineHeight='1.2'>
        {valor}
      </Text>
    </Box>
  );
}

export function IndicadoresPublicosView({
  indicadores,
}: {
  indicadores: IndicadoresPublicos;
}) {
  const { metricas, vencimientos } = indicadores;
  const detalleCumplimiento =
    metricas.total_tareas > 0
      ? `${metricas.completadas} de ${metricas.total_tareas} tareas cerradas`
      : "Sin tareas cerradas en el período";

  const datosVencimientos: Array<{
    categoria: string;
    [key: string]: string | number;
  }> = vencimientos.por_categoria.map((categoria) => ({
    categoria: categoria.nombre,
    Vigentes: categoria.vigentes,
    "Próximos a vencer": categoria.proximos,
    Vencidos: categoria.vencidos,
  }));

  return (
    <VStack align='stretch' gap={6}>
      <Box>
        <HStack gap={2} mb={3}>
          <Icon as={FiCheckCircle} color='green.600' boxSize={5} />
          <Text as='h2' fontSize='lg' fontWeight='semibold' color='gray.800'>
            Cumplimiento de tareas
          </Text>
        </HStack>

        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            xl: "repeat(4, 1fr)",
          }}
          gap={4}
        >
          <MetricCard
            metricKey='cumplimiento'
            titulo='Cumplimiento'
            valor={metricas.porcentaje_cumplimiento}
            unidad='porcentaje'
            detalle={detalleCumplimiento}
          />
          <MetricCard
            metricKey='tareas_cerradas'
            titulo='Tareas cerradas'
            valor={metricas.total_tareas}
            unidad='cantidad'
            detalle='En el período'
          />
          <MetricCard
            metricKey='completadas'
            titulo='Completadas'
            valor={metricas.completadas}
            unidad='cantidad'
            detalle='Tareas realizadas'
          />
          <MetricCard
            metricKey='incumplidas'
            titulo='Incumplidas'
            valor={metricas.incumplidas}
            unidad='cantidad'
            detalle='Tareas no realizadas'
          />
        </Grid>
      </Box>

      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
        <Card.Root shadow='md' h='full'>
          <Card.Header>
            <HStack gap={2}>
              <Icon as={FiActivity} color='green.600' boxSize={5} />
              <Text
                as='h3'
                fontSize='md'
                fontWeight='semibold'
                color='gray.800'
              >
                Distribución de tareas
              </Text>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack align='stretch' gap={4}>
              <Text fontSize='xs' color='gray.500'>
                Tareas cerradas en el período
              </Text>
              <SegmentedBar
                segmentos={[
                  { label: "Completadas", valor: metricas.completadas },
                  { label: "No realizadas", valor: metricas.incumplidas },
                ]}
              />
            </VStack>
          </Card.Body>
        </Card.Root>

        <Card.Root shadow='md' h='full'>
          <Card.Header>
            <HStack gap={2}>
              <Icon as={FiClock} color='orange.500' boxSize={5} />
              <Text
                as='h3'
                fontSize='md'
                fontWeight='semibold'
                color='gray.800'
              >
                Resumen de vencimientos
              </Text>
            </HStack>
          </Card.Header>
          <Card.Body>
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
              <VencimientoStat
                label='Total'
                valor={vencimientos.total}
                color='blue.600'
              />
              <VencimientoStat
                label='Vencidos'
                valor={vencimientos.vencidos}
                color='red.600'
              />
              <VencimientoStat
                label='Próximos'
                valor={vencimientos.proximos}
                color='yellow.600'
              />
              <VencimientoStat
                label='Vigentes'
                valor={vencimientos.vigentes}
                color='green.600'
              />
            </SimpleGrid>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Box>
        <HStack gap={2} mb={3}>
          <Icon as={FiAlertTriangle} color='orange.500' boxSize={5} />
          <Text as='h3' fontSize='lg' fontWeight='semibold' color='gray.800'>
            Vencimientos por categoría
          </Text>
        </HStack>

        {vencimientos.total > 0 ? (
          <GroupedStackedBar
            title='Distribución por categoría'
            data={datosVencimientos}
            keys={CLAVES_VENCIMIENTOS}
            keyLabels={ETIQUETAS_VENCIMIENTOS}
          />
        ) : (
          <Card.Root shadow='md'>
            <Card.Body>
              <Text fontSize='sm' color='gray.500' textAlign='center' py={4}>
                No hay vencimientos registrados en este momento.
              </Text>
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </VStack>
  );
}
