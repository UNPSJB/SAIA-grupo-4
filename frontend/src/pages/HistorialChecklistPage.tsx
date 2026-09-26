import { useState, useMemo } from "react";
import {
  Box,
  Container,
  VStack,
  Text,
  Center,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { FiShield, FiInbox, FiArchive } from "react-icons/fi";

import type { MetricasCumplimiento, TareaHistorialItem } from "../features/historial/types";
import { mockTareasHistorial } from "../features/historial/mockHistorial";
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
  // Regla de Nico: el tope máximo de auditoría histórica es siempre el día de ayer
  const fechaAyer = useMemo(() => getFechaRelativa(1), []);
  const fechaHace7Dias = useMemo(() => getFechaRelativa(7), []);

  const [fechaDesde, setFechaDesde] = useState(fechaHace7Dias);
  const [fechaHasta, setFechaHasta] = useState(fechaAyer);

  const [rangoAplicado, setRangoAplicado] = useState({
    desde: fechaHace7Dias,
    hasta: fechaAyer,
  });

  const tareasFiltradas = useMemo(() => {
    return mockTareasHistorial.filter((t) => {
      return (
        t.fechaProgramada >= rangoAplicado.desde &&
        t.fechaProgramada <= rangoAplicado.hasta
      );
    });
  }, [rangoAplicado]);

  const metricas: MetricasCumplimiento = useMemo(() => {
    const total = tareasFiltradas.length;
    const completadas = tareasFiltradas.filter((t) => t.estado === "completada").length;
    const incumplidas = tareasFiltradas.filter((t) => t.estado === "incumplida").length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return {
      totalTareas: total,
      completadas,
      incumplidas,
      porcentajeCumplimiento: porcentaje,
    };
  }, [tareasFiltradas]);

  // Si intentan poner una fecha posterior a ayer, se fuerza el tope en ayer
  const handleCambiarFechaHasta = (nuevaHasta: string) => {
    if (nuevaHasta > fechaAyer) {
      setFechaHasta(fechaAyer);
    } else {
      setFechaHasta(nuevaHasta);
    }
  };

  const handleAplicarFiltro = () => {
    const hastaSegura = fechaHasta > fechaAyer ? fechaAyer : fechaHasta;
    setFechaHasta(hastaSegura);
    setRangoAplicado({ desde: fechaDesde, hasta: hastaSegura });
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
      {/* Barra superior institucional SAIA-4 - Vista Administrador */}
      <Box bg="green.600" px={{ base: 4, md: 8 }} py={3} color="white" boxShadow="sm">
        <Container maxW="container.lg" px={0}>
          <HStack justify="space-between" align="center">
            <HStack gap={2.5}>
              <FiShield size={22} strokeWidth={2.5} />
              <Text fontSize="lg" fontWeight="bold" letterSpacing="wide">
                SAIA-4
              </Text>
            </HStack>
            <HStack gap={2}>
              <Badge colorPalette="green" bg="green.700" color="white" px={2} py={0.5} fontSize="2xs">
                VISTA ADMINISTRADOR
              </Badge>
              <Text fontSize="xs" opacity={0.85} fontWeight="medium">
                Auditoría y POES
              </Text>
            </HStack>
          </HStack>
        </Container>
      </Box>

      {/* Contenido principal */}
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
          {tareasFiltradas.length === 0 ? (
            <Center py={16} flexDirection="column" color="gray.400" bg="white" borderRadius="xl" border="1px dashed" borderColor="gray.300">
              <FiInbox size={44} />
              <Text mt={3} fontSize="sm" fontWeight="medium">
                No se encontraron checklists registrados en el período seleccionado.
              </Text>
            </Center>
          ) : (
            <VStack align="stretch" gap={3} w="100%">
              {tareasFiltradas.map((tarea: TareaHistorialItem) =>
                tarea.estado === "completada" ? (
                  <TareaCardCompletadaHistorial
                    key={tarea.id}
                    tarea={{
                      ...tarea,
                      estado: "completada",
                      tipo: tarea.tipo,
                      quimicosSugeridos: [],
                      elementosLimpieza: tarea.elementosLimpieza || [],
                      procedimiento: tarea.procedimiento || [],
                      auditoria: tarea.auditoria
                        ? {
                            realizadoPor: tarea.auditoria.realizadoPor || "Operario",
                            hora: tarea.auditoria.hora || "--:--",
                            fecha: tarea.auditoria.fecha,
                            consumoRegistrado: tarea.auditoria.consumoRegistrado || [],
                            observacion: tarea.auditoria.observacion,
                            fotoNombre: tarea.auditoria.fotoNombre,
                            fotoUrl: tarea.auditoria.fotoUrl,
                          }
                        : undefined,
                    } as any}
                  />
                ) : (
                  <TareaCardIncumplida key={tarea.id} tarea={tarea} />
                )
              )}
            </VStack>
          )}
        </Container>
      </Box>
    </Box>
  );
}