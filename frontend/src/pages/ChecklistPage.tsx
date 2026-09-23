import { useState, useMemo } from "react";
import { Box, Container, VStack, Text, Center, HStack } from "@chakra-ui/react";
import { FiInbox, FiShield } from "react-icons/fi";

import type { TareaChecklist, TipoMomento } from "../features/checklists/types";
import { mockOperario, mockTareasIniciales } from "../features/checklists/mockData";
import { ChecklistHeader } from "../features/checklists/components/ChecklistHeader";
import { ChecklistFiltros } from "../features/checklists/components/ChecklistFiltros";
import { TareaCardPendiente } from "../features/checklists/components/TareaCardPendiente";
import { TareaCardCompletada } from "../features/checklists/components/TareaCardCompletada";
import { EvidenciaModal } from "../features/checklists/EvidenciaModal";

export default function ChecklistPage() {
  const [tareas, setTareas] = useState<TareaChecklist[]>(mockTareasIniciales);
  const [filtro, setFiltro] = useState<"todos" | TipoMomento>("todos");

  const [tareaSeleccionadaParaFoto, setTareaSeleccionadaParaFoto] = useState<TareaChecklist | null>(null);
  const [fotosPorTarea, setFotosPorTarea] = useState<{ [id: number]: File | null }>({});
  const [modalFotoAbierto, setModalFotoAbierto] = useState(false);

  const totalTareas = tareas.length;
  const completadas = tareas.filter((t) => t.estado === "completada").length;

  const conteo = useMemo(() => {
    return {
      todos: tareas.length,
      preOperacional: tareas.filter((t) => t.tipo === "pre-operacional").length,
      operacional: tareas.filter((t) => t.tipo === "operacional").length,
    };
  }, [tareas]);

  const tareasFiltradas = useMemo(() => {
    if (filtro === "todos") return tareas;
    return tareas.filter((t) => t.tipo === filtro);
  }, [tareas, filtro]);

  const handleAbrirModalFoto = (tarea: TareaChecklist) => {
    setTareaSeleccionadaParaFoto(tarea);
    setModalFotoAbierto(true);
  };

  const handleConfirmarFoto = (foto: File | null) => {
    if (tareaSeleccionadaParaFoto) {
      setFotosPorTarea((prev) => ({
        ...prev,
        [tareaSeleccionadaParaFoto.id]: foto,
      }));
    }
    setModalFotoAbierto(false);
  };

  const handleCompletarTarea = (tareaId: number, consumos: string[]) => {
    const ahora = new Date();
    const horaStr = ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " hs";
    const fechaStr = ahora.toLocaleDateString("es-AR");
    const fotoAdjunta = fotosPorTarea[tareaId];

    setTareas((prev) =>
      prev.map((t) => {
        if (t.id !== tareaId) return t;

        return {
          ...t,
          estado: "completada",
          auditoria: {
            realizadoPor: mockOperario.nombre,
            hora: horaStr,
            fecha: fechaStr,
            consumoRegistrado: consumos.length > 0 ? consumos : ["Sin consumo químico registrado"],
            fotoNombre: fotoAdjunta ? fotoAdjunta.name : undefined,
            fotoUrl: fotoAdjunta ? URL.createObjectURL(fotoAdjunta) : undefined,
          },
        };
      })
    );
  };

  const fechaHoyStr = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Box bg="gray.50" minH="100vh">
      {/* Barra superior institucional SAIA-4 */}
      <Box bg="green.600" px={{ base: 4, md: 8 }} py={3} color="white" boxShadow="sm">
        <Container maxW="container.lg" px={0}>
          <HStack justify="space-between" align="center">
            <HStack gap={2.5}>
              <FiShield size={22} strokeWidth={2.5} />
              <Text fontSize="lg" fontWeight="bold" letterSpacing="wide">
                SAIA-4
              </Text>
            </HStack>
            <Text fontSize="xs" opacity={0.85} fontWeight="medium">
              Módulo Operario
            </Text>
          </HStack>
        </Container>
      </Box>

      {/* Contenido principal */}
      <Box py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
        <Container maxW="container.lg" px={0}>
          <ChecklistHeader
            operario={mockOperario}
            fechaStr={fechaHoyStr}
            totalTareas={totalTareas}
            completadas={completadas}
          />

          <ChecklistFiltros
            filtroActual={filtro}
            onCambiarFiltro={setFiltro}
            conteo={conteo}
          />

          {tareasFiltradas.length === 0 ? (
            <Center py={16} flexDirection="column" color="gray.400">
              <FiInbox size={48} />
              <Text mt={3} fontSize="md" fontWeight="medium">
                No hay tareas en esta categoría para el día de hoy.
              </Text>
            </Center>
          ) : (
            <VStack align="stretch" gap={3} w="100%">
              {tareasFiltradas.map((tarea) =>
                tarea.estado === "completada" ? (
                  <TareaCardCompletada key={tarea.id} tarea={tarea} />
                ) : (
                  <TareaCardPendiente
                    key={tarea.id}
                    tarea={tarea}
                    onAbrirModalFoto={handleAbrirModalFoto}
                    onCompletarTarea={handleCompletarTarea}
                    fotoSeleccionada={fotosPorTarea[tarea.id]}
                  />
                )
              )}
            </VStack>
          )}

          <EvidenciaModal
            open={modalFotoAbierto}
            tareaNombre={tareaSeleccionadaParaFoto?.nombre || "Tarea"}
            onConfirm={handleConfirmarFoto}
            onCancel={() => setModalFotoAbierto(false)}
          />
        </Container>
      </Box>
    </Box>
  );
}