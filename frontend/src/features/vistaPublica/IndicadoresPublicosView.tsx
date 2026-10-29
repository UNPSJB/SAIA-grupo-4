import type { ElementType } from "react";
import {
  Badge,
  Box,
  Card,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiCheckCircle,
  FiFileText,
  FiPackage,
  FiTool,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import type {
  CategoriaVencimientosPublica,
  IndicadoresPublicos,
} from "./types";

const TITULOS_CATEGORIA: Record<string, string> = {
  Equipos: "Equipos calibrados al día",
  Documentos: "Documentos al día",
  "Elementos de limpieza": "Elementos de limpieza al día",
  Personal: "Documentación del personal al día",
};

const ICONOS_CATEGORIA: Record<string, ElementType> = {
  Equipos: FiTool,
  Documentos: FiFileText,
  "Elementos de limpieza": FiPackage,
  Personal: FiUsers,
};

function MiniStat({ label, valor }: { label: string; valor: number }) {
  return (
    <Box
      p={3}
      borderRadius='lg'
      bg='gray.50'
      borderWidth='1px'
      borderColor='gray.100'
    >
      <Text
        fontSize='2xs'
        fontWeight='bold'
        color='gray.500'
        textTransform='uppercase'
      >
        {label}
      </Text>
      <Text fontSize='lg' fontWeight='bold' color='gray.700'>
        {valor}
      </Text>
    </Box>
  );
}

function BarraProgreso({
  porcentaje,
  sinDatos = false,
}: {
  porcentaje: number;
  sinDatos?: boolean;
}) {
  const ancho = sinDatos ? 0 : Math.min(Math.max(porcentaje, 0), 100);

  return (
    <Box
      w='100%'
      bg='gray.100'
      borderRadius='full'
      h='8px'
      overflow='hidden'
    >
      <Box
        bg={sinDatos ? "gray.300" : "green.500"}
        h='100%'
        borderRadius='full'
        style={{
          width: `${ancho}%`,
          transition: "width 0.4s ease",
        }}
      />
    </Box>
  );
}

function IndicadorAlDiaCard({
  categoria,
}: {
  categoria: CategoriaVencimientosPublica;
}) {
  const titulo =
    TITULOS_CATEGORIA[categoria.nombre] ?? `${categoria.nombre} al día`;
  const Icono = ICONOS_CATEGORIA[categoria.nombre] ?? FiActivity;
  const sinDatos = categoria.total === 0;

  return (
    <Card.Root shadow='sm' borderWidth='1px' borderColor='gray.200'>
      <Card.Body>
        <VStack align='stretch' gap={3}>
          <HStack justify='space-between' align='flex-start' gap={3}>
            <HStack gap={2} align='flex-start'>
              <Box
                p={2}
                borderRadius='lg'
                bg='green.50'
                color='green.600'
                flexShrink={0}
              >
                <Icon as={Icono} boxSize={4} />
              </Box>
              <Text fontWeight='semibold' color='gray.800' lineHeight='1.3'>
                {titulo}
              </Text>
            </HStack>
            <Text
              fontSize='2xl'
              fontWeight='extrabold'
              color={sinDatos ? "gray.400" : "green.700"}
              lineHeight='1'
            >
              {sinDatos ? "—" : `${categoria.porcentaje_al_dia}%`}
            </Text>
          </HStack>

          <Text fontSize='xs' color='gray.500'>
            {sinDatos
              ? "Sin registros"
              : `${categoria.al_dia} de ${categoria.total} al día`}
          </Text>

          <BarraProgreso
            porcentaje={categoria.porcentaje_al_dia}
            sinDatos={sinDatos}
          />
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

export function IndicadoresPublicosView({
  indicadores,
}: {
  indicadores: IndicadoresPublicos;
}) {
  const { metricas, vencimientos } = indicadores;
  const sinTareas = metricas.tareas_totales === 0;
  const sinVencimientos = vencimientos.total === 0;
  const cumplimientoOptimo = metricas.porcentaje_cumplimiento >= 80;
  const detalleCumplimiento = sinTareas
    ? "Sin tareas cerradas en el período"
    : `${metricas.tareas_completadas} de ${metricas.tareas_totales} tareas cerradas`;

  return (
    <VStack align='stretch' gap={6}>
      <Card.Root shadow='sm' borderWidth='1px' borderColor='gray.200'>
        <Card.Body>
          <Flex
            direction={{ base: "column", md: "row" }}
            justify='space-between'
            align={{ base: "stretch", md: "center" }}
            gap={5}
          >
            <HStack gap={3} align='flex-start'>
              <Box
                p={3}
                borderRadius='lg'
                bg='green.50'
                color='green.600'
                flexShrink={0}
              >
                <FiTrendingUp size={24} />
              </Box>
              <VStack align='start' gap={1}>
                <Text
                  fontSize='xs'
                  fontWeight='semibold'
                  color='gray.500'
                  textTransform='uppercase'
                >
                  Cumplimiento de checklists
                </Text>
                <HStack gap={2} wrap='wrap'>
                  <Text
                    fontSize='3xl'
                    fontWeight='extrabold'
                    color='gray.800'
                    lineHeight='1'
                  >
                    {sinTareas ? "—" : `${metricas.porcentaje_cumplimiento}%`}
                  </Text>
                  <Badge
                    colorPalette={cumplimientoOptimo ? "green" : "gray"}
                    variant='subtle'
                    fontSize='xs'
                  >
                    {sinTareas
                      ? "Sin datos"
                      : cumplimientoOptimo
                        ? "Óptimo"
                        : "En seguimiento"}
                  </Badge>
                </HStack>
                <Text fontSize='sm' color='gray.600'>
                  {detalleCumplimiento}
                </Text>
              </VStack>
            </HStack>

            <SimpleGrid
              columns={2}
              gap={3}
              minW={{ base: "100%", md: "260px" }}
            >
              <MiniStat
                label='Realizadas'
                valor={metricas.tareas_completadas}
              />
              <MiniStat label='Cerradas' valor={metricas.tareas_totales} />
            </SimpleGrid>
          </Flex>

          <Box mt={4}>
            <BarraProgreso
              porcentaje={metricas.porcentaje_cumplimiento}
              sinDatos={sinTareas}
            />
          </Box>
        </Card.Body>
      </Card.Root>

      <Box>
        <HStack gap={2} mb={3}>
          <Icon as={FiCheckCircle} color='green.600' boxSize={5} />
          <Text as='h2' fontSize='lg' fontWeight='semibold' color='gray.800'>
            Vencimientos al día
          </Text>
        </HStack>

        <Card.Root
          shadow='sm'
          borderWidth='1px'
          borderColor='gray.200'
          mb={4}
        >
          <Card.Body>
            <Flex justify='space-between' align='center' gap={4} wrap='wrap'>
              <VStack align='start' gap={1}>
                <Text fontSize='sm' fontWeight='medium' color='gray.600'>
                  Resumen general
                </Text>
                <HStack gap={2} wrap='wrap'>
                  <Text
                    fontSize='2xl'
                    fontWeight='extrabold'
                    color={sinVencimientos ? "gray.400" : "green.700"}
                  >
                    {sinVencimientos ? "—" : `${vencimientos.porcentaje_al_dia}%`}
                  </Text>
                  <Text fontSize='sm' color='gray.500'>
                    {sinVencimientos
                      ? "Sin registros"
                      : `${vencimientos.al_dia} de ${vencimientos.total} al día`}
                  </Text>
                </HStack>
              </VStack>
              <Icon as={FiCheckCircle} color='green.500' boxSize={8} />
            </Flex>

            <Box mt={3}>
              <BarraProgreso
                porcentaje={vencimientos.porcentaje_al_dia}
                sinDatos={sinVencimientos}
              />
            </Box>
          </Card.Body>
        </Card.Root>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {vencimientos.por_categoria.map((categoria) => (
            <IndicadorAlDiaCard
              key={categoria.nombre}
              categoria={categoria}
            />
          ))}
        </SimpleGrid>
      </Box>
    </VStack>
  );
}
