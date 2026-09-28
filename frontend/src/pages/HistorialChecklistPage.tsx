import { useState, useMemo } from "react";
import { Box, Button, Container, VStack, Text, Center, HStack } from "@chakra-ui/react";
import { FiInbox, FiArchive } from "react-icons/fi";

import { AlertMessage, LoadingState } from "../components/ui";
import type { MetricasCumplimiento } from "../features/historial/types";
import { useHistorial } from "../features/historial/hooks/useHistorial";
import { HistorialFiltros } from "../features/historial/components/HistorialFiltros";
import { HistorialMetricas } from "../features/historial/components/HistorialMetricas";
import { TareaCardIncumplida } from "../features/historial/components/TareaCardIncumplida";
import { TareaCardCompletadaHistorial } from "../features/historial/components/TareaCardCompletadaHistorial";

// Función para calcular fechas en formato YYYY-MM-DD restando días desde hoy
const getFechaRelativa = (diasAtras: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export default function HistorialChecklistPage() {
  // El backend solo permite consultar fechas anteriores al día de hoy, así que el
  // tope máximo del filtro es siempre ayer.
  const fechaAyer = useMemo(() => getFechaRelativa(1), []);
  const fechaHace7Dias = useMemo(() => getFechaRelativa(7), []);

  const [fechaDesde, setFechaDesde] = useState(fechaHace7Dias);
  const [fechaHasta, setFechaHasta] = useState(fechaAyer);

  // El rango que se consulta al backend. Se separa del borrador para no pedir
  // datos en cada tipeo del filtro.
  const [rangoAplicado, setRangoAplicado] = useState({
    desde: fechaHace7Dias,
    hasta: fechaAyer,
  });

  const { ejecuciones, loading, error, reload } = useHistorial({
    desde: rangoAplicado.desde,
    hasta: rangoAplicado.hasta,
  });

  const metricas: MetricasCumplimiento = useMemo(() => {
    const totalTareas = ejecuciones.length;
    const completadas = ejecuciones.filter((e) => e.estado === "COMPLETADA").length;
    const incumplidas = ejecuciones.filter((e) => e.estado === "NO_REALIZADA").length;
    const porcentajeCumplimiento =
      totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

    return { totalTareas, completadas, incumplidas, porcentajeCumplimiento };
  }, [ejecuciones]);

  // Si intentan poner una fecha posterior a ayer, se fuerza el tope en ayer
  const handleCambiarFechaHasta = (nuevaHasta: string) => {
    if (nuevaHasta > fechaAyer) {
      setFechaHasta(fechaAyer);
    } else {
      setFechaHasta(nuevaHasta);
    }
  };

  const handleAplicarFiltro = () => {
    // Tope máximo: Hasta no puede superar el día de ayer
    const hastaSegura = fechaHasta > fechaAyer ? fechaAyer : fechaHasta;
    
    //Tope mínimo: Desde no puede superar a la fecha Hasta
    const desdeSegura = fechaDesde > hastaSegura ? hastaSegura : fechaDesde;

    // Se actualizan los inputs visuales para reflejar la corrección
    setFechaHasta(hastaSegura);
    setFechaDesde(desdeSegura);
    
    // Se aplica el rango validado para disparar la consulta al backend
    setRangoAplicado({ desde: desdeSegura, hasta: hastaSegura });
  };

  const handleResetFiltro = () => {
    setFechaDesde(fechaHace7Dias);
    setFechaHasta(fechaAyer);
    setRangoAplicado({ desde: fechaHace7Dias, hasta: fechaAyer });
  };

  const handleSeleccionarRapido = (dias: number) => {
    const desde = getFechaRelativa(dias);
    const hasta = fechaAyer;
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setRangoAplicado({ desde, hasta });
  };

  return (
    <Box bg="gray.50" minH="100vh">
      {/* Contenido principal. Esta vista solo se alcanza desde el NavBar, que ya
          aporta la marca institucional, por eso no lleva barra propia. */}
      <Box py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
        <Container maxW="container.lg" px={0}>
          {/* Título de la sección */}
          <Box mb={5}>
            <HStack gap={2} mb={1}>
              <FiArchive color="#2F855A" size={20} />
              <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="extrabold" color="gray.800">
                Historial de Checklists y Auditoría
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Consulta de registros históricos, verificación de desvíos y métricas de cumplimiento de inocuidad.
            </Text>
          </Box>

          {/* Filtros de Rango de Fechas (CA1) */}
          <HistorialFiltros
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            fechaMax={fechaAyer}
            onCambiarFechaDesde={setFechaDesde}
            onCambiarFechaHasta={handleCambiarFechaHasta}
            onAplicarFiltro={handleAplicarFiltro}
            onResetFiltro={handleResetFiltro}
            onSeleccionarRapido={handleSeleccionarRapido}
          />

          {/* Tarjeta de Métricas y Cumplimiento % (CA2) */}
          <HistorialMetricas metricas={metricas} />

          {/* Listado de Tareas Históricas (CA3 y CA4) */}
          {loading && <LoadingState message="Cargando historial..." />}

          {!loading && error && (
            <>
              <AlertMessage type="error" message={error} />
              <Center mt={4}>
                <Button onClick={reload}>Reintentar</Button>
              </Center>
            </>
          )}

          {!loading && !error && ejecuciones.length === 0 && (
            <Center py={16} flexDirection="column" color="gray.400" bg="white" borderRadius="xl" border="1px dashed" borderColor="gray.300">
              <FiInbox size={44} />
              <Text mt={3} fontSize="sm" fontWeight="medium" textAlign="center">
                No se encontraron checklists registrados en el período seleccionado.
              </Text>
            </Center>
          )}

          {!loading && !error && ejecuciones.length > 0 && (
            <VStack align="stretch" gap={3} w="100%">
              {ejecuciones.map((ejecucion) =>
                ejecucion.estado === "COMPLETADA" ? (
                  <TareaCardCompletadaHistorial key={ejecucion.id} ejecucion={ejecucion} />
                ) : (
                  <TareaCardIncumplida key={ejecucion.id} ejecucion={ejecucion} />
                ),
              )}
            </VStack>
          )}
        </Container>
      </Box>
    </Box>
  );
}
