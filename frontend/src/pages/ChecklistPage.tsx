import { useState, useMemo } from "react";
import { Box, Button, Container, VStack, Text, Center, HStack, Icon } from "@chakra-ui/react";
import { FiInbox, FiLogOut, FiShield } from "react-icons/fi";

import { useAuth } from "../features/auth/useAuth";
import { AlertConfirm, AlertMessage, LoadingState } from "../components/ui";
import type { EjecucionTarea, RegistroConsumoQuimico } from "../features/checklists/types";
import { useChecklistHoy } from "../features/checklists/hooks/useChecklistHoy";
import { useCompletarTarea } from "../features/checklists/hooks/useCompletarTarea";
import { ChecklistHeader } from "../features/checklists/components/ChecklistHeader";
import {
  ChecklistFiltros,
  type FiltroChecklist,
} from "../features/checklists/components/ChecklistFiltros";
import { TareaCardPendiente } from "../features/checklists/components/TareaCardPendiente";
import { TareaCardCompletada } from "../features/checklists/components/TareaCardCompletada";
import { EvidenciaModal } from "../features/checklists/EvidenciaModal";

interface ChecklistPageProps {
  // El operador entra sin NavBar, así que esta vista imprime su propia barra
  // institucional. El admin ya tiene el NavBar y la barra sería un duplicado.
  mostrarBarraInstitucional?: boolean;
}

export default function ChecklistPage({
  mostrarBarraInstitucional = true,
}: ChecklistPageProps) {
  const { usuario, logout } = useAuth();
  const { ejecuciones, loading, error, reload } = useChecklistHoy();
  const { completarTarea, isSubmitting } = useCompletarTarea({
    operadorId: usuario?.personaId ?? 0,
  });

  const [filtro, setFiltro] = useState<FiltroChecklist>("todos");
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [cerrarSesionAbierto, setCerrarSesionAbierto] = useState(false);

  const [tareaSeleccionadaParaFoto, setTareaSeleccionadaParaFoto] = useState<EjecucionTarea | null>(null);
  const [fotosPorTarea, setFotosPorTarea] = useState<Record<number, File | null>>({});
  const [modalFotoAbierto, setModalFotoAbierto] = useState(false);

  const completadas = ejecuciones.filter((e) => e.estado === "COMPLETADA").length;

  const conteo = useMemo(() => {
    const porTipo = (tipo: FiltroChecklist) =>
      tipo === "todos"
        ? ejecuciones.length
        : ejecuciones.filter((e) => e.tarea.tipo_poes === tipo).length;

    return {
      todos: porTipo("todos"),
      pre_operacional: porTipo("pre_operacional"),
      operacional: porTipo("operacional"),
      post_operacional: porTipo("post_operacional"),
    };
  }, [ejecuciones]);

  const ejecucionesFiltradas = useMemo(() => {
    if (filtro === "todos") return ejecuciones;
    return ejecuciones.filter((e) => e.tarea.tipo_poes === filtro);
  }, [ejecuciones, filtro]);

  const handleAbrirModalFoto = (ejecucion: EjecucionTarea) => {
    setTareaSeleccionadaParaFoto(ejecucion);
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

  const handleCompletarEjecucion = async (
    ejecucionId: number,
    consumos: RegistroConsumoQuimico[],
    observacion: string,
  ) => {
    setMensaje(null);

    const res = await completarTarea(
      ejecucionId,
      consumos,
      observacion,
      fotosPorTarea[ejecucionId] ?? null,
    );

    if (res.status === "error") {
      setMensaje({ tipo: "error", texto: res.message });
      return;
    }

    setMensaje({ tipo: "success", texto: "Tarea registrada exitosamente." });
    // El backend genera ejecuciones faltantes y cierra vencidas en cada GET, así
    // que se recarga para quedar sincronizados con el servidor.
    reload();
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
      {mostrarBarraInstitucional && (
        <Box bg="green.600" px={{ base: 4, md: 8 }} py={3} color="white" boxShadow="sm">
          <Container maxW="container.lg" px={0}>
            <HStack justify="space-between" align="center">
              <HStack gap={2.5}>
                <FiShield size={22} strokeWidth={2.5} />
                <Text fontSize="lg" fontWeight="bold" letterSpacing="wide">
                  SAIA-4
                </Text>
              </HStack>
              <Button
                variant="ghost"
                color="white"
                size="sm"
                onClick={() => setCerrarSesionAbierto(true)}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Icon as={FiLogOut} />
                Cerrar sesión
              </Button>
            </HStack>
          </Container>
        </Box>
      )}

      {/* contenido principal */}
      <Box py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
        <Container maxW="container.lg" px={0}>
          <ChecklistHeader
            nombreOperario={usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : ""}
            capacidades={usuario?.capacidades.map((c) => c.nombre) ?? []}
            fechaStr={fechaHoyStr}
            totalTareas={ejecuciones.length}
            completadas={completadas}
          />

          {mensaje && (
            <AlertMessage
              type={mensaje.tipo}
              message={mensaje.texto}
            />
          )}

          {loading && <LoadingState message="Cargando checklist del día..." />}

          {!loading && error && (
            <AlertMessage type="error" message={error} />
          )}

          {!loading && !error && (
            <>
              <ChecklistFiltros
                filtroActual={filtro}
                onCambiarFiltro={setFiltro}
                conteo={conteo}
              />

              {ejecucionesFiltradas.length === 0 ? (
                <Center py={16} flexDirection="column" color="gray.400">
                  <FiInbox size={48} />
                  <Text mt={3} fontSize="md" fontWeight="medium" textAlign="center">
                    No hay tareas en esta categoría para el día de hoy.
                  </Text>
                </Center>
              ) : (
                <VStack align="stretch" gap={3} w="100%">
                  {ejecucionesFiltradas.map((ejecucion) =>
                    ejecucion.estado === "COMPLETADA" ? (
                      <TareaCardCompletada key={ejecucion.id} ejecucion={ejecucion} />
                    ) : (
                      <TareaCardPendiente
                        key={ejecucion.id}
                        ejecucion={ejecucion}
                        onAbrirModalFoto={handleAbrirModalFoto}
                        onCompletarEjecucion={handleCompletarEjecucion}
                        fotoSeleccionada={fotosPorTarea[ejecucion.id]}
                        isSubmitting={isSubmitting}
                      />
                    ),
                  )}
                </VStack>
              )}
            </>
          )}

          <EvidenciaModal
            open={modalFotoAbierto}
            tareaNombre={tareaSeleccionadaParaFoto?.tarea.nombre || "Tarea"}
            loading={isSubmitting}
            onConfirm={handleConfirmarFoto}
            onCancel={() => setModalFotoAbierto(false)}
          />

          <AlertConfirm
            open={cerrarSesionAbierto}
            title='Cerrar sesión'
            message='¿Estás seguro de que querés cerrar tu sesión?'
            onConfirm={() => {
              setCerrarSesionAbierto(false);
              logout();
            }}
            onCancel={() => setCerrarSesionAbierto(false)}
          />
        </Container>
      </Box>
    </Box>
  );
}
