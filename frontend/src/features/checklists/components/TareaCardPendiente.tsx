import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Input,
  Separator,
} from "@chakra-ui/react";
import {
  FiClock,
  FiMapPin,
  FiTool,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiCamera,
  FiCheck,
} from "react-icons/fi";
import type { EjecucionTarea, RegistroConsumoQuimico } from "../types";
import { etiquetaTipoPoe, obtenerDestino, obtenerPasosPoes } from "../utils";

interface TareaCardPendienteProps {
  ejecucion: EjecucionTarea;
  onAbrirModalFoto: (ejecucion: EjecucionTarea) => void;
  onCompletarEjecucion: (
    ejecucionId: number,
    consumos: RegistroConsumoQuimico[],
    observacion: string,
  ) => void;
  fotoSeleccionada?: File | null;
  isSubmitting?: boolean;
}

export function TareaCardPendiente({
  ejecucion,
  onAbrirModalFoto,
  onCompletarEjecucion,
  fotoSeleccionada,
  isSubmitting = false,
}: TareaCardPendienteProps) {
  const [poesAbierto, setPoesAbierto] = useState(false);
  const [observacion, setObservacion] = useState("");

  const { tarea } = ejecucion;
  const pasosPoes = obtenerPasosPoes(tarea.metodo);

  // Se indexa por insumo_quimico.id (id global del catálogo), no por el índice
  // del arreglo, para no mezclar consumos entre insumos.
  const [consumos, setConsumos] = useState<{ [id: number]: string }>(() => {
    const inicial: { [id: number]: string } = {};
    tarea.insumos_quimicos.forEach((item) => {
      inicial[item.insumo_quimico.id] =
        item.dosis_sugerida !== null ? String(item.dosis_sugerida) : "";
    });
    return inicial;
  });

  const handleCambioConsumo = (id: number, val: string) => {
    setConsumos((prev) => ({ ...prev, [id]: val }));
  };

  const handleMarcarRealizada = () => {
    const listaConsumos = tarea.insumos_quimicos.map((item) => {
      const valor = parseFloat(consumos[item.insumo_quimico.id]);

      // El backend solo registra consumos > 0 y no admite negativos (ge=0).
      // Un campo vacío o inválido se envía como null ("no se usó").
      const cantidad = Number.isFinite(valor) && valor > 0 ? valor : null;

      return {
        insumo_quimico_id: item.insumo_quimico.id,
        cantidad_utilizada: cantidad,
      };
    });

    onCompletarEjecucion(ejecucion.id, listaConsumos, observacion);
  };

  return (
    <Box
      bg="white"
      p={{ base: 4, md: 5 }}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
      borderLeft="4px solid"
      borderLeftColor="orange.400"
      w="100%"
      boxSizing="border-box"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
        <HStack gap={2}>
          <Badge colorScheme="orange" variant="subtle" px={2} py={0.5} borderRadius="md" fontSize="xs">
            <HStack gap={1}>
              <FiClock size={12} />
              <Text textTransform="uppercase" fontWeight="bold">
                PENDIENTE
              </Text>
            </HStack>
          </Badge>
          <Badge colorScheme="blue" variant="outline" px={2} py={0.5} borderRadius="md" fontSize="2xs">
            {etiquetaTipoPoe(tarea.tipo_poes)}
          </Badge>
        </HStack>
      </Flex>

      <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color="gray.800" mb={1} wordBreak="break-word">
        {tarea.nombre}
      </Text>
      <HStack color="gray.600" fontSize="xs" mb={2} gap={1.5} align="flex-start">
        <Box pt="2px"><FiMapPin size={13} color="#718096" /></Box>
        <Text wordBreak="break-word">
          Destino: <strong>{obtenerDestino(tarea)}</strong>
        </Text>
      </HStack>

      {/* Elementos y utensilios con cantidades */}
      {tarea.elementos_limpieza.length > 0 && (
        <HStack color="gray.600" fontSize="xs" mb={3} gap={1.5} align="flex-start">
          <Box pt="2px"><FiTool size={13} color="#718096" /></Box>
          <Text wordBreak="break-word">
            Usar:{" "}
            <strong>
              {tarea.elementos_limpieza
                .map((e) => `${e.cantidad_requerida} ${e.elemento_limpieza.nombre}`)
                .join(", ")}
            </strong>
          </Text>
        </HStack>
      )}

      {/* POES */}
      {pasosPoes.length > 0 && (
        <Box my={2} p={2} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.100">
          <Button
            size="xs"
            variant="ghost"
            width="100%"
            justifyContent="space-between"
            onClick={() => setPoesAbierto(!poesAbierto)}
            color="gray.700"
            _hover={{ bg: "gray.100" }}
            whiteSpace="normal"
            textAlign="left"
            height="auto"
            py={1.5}
          >
            <HStack gap={2}>
              <FiFileText color="#3182CE" />
              <Text fontWeight="semibold" fontSize="xs">Ver Guía Paso a Paso (Instrucciones POES)</Text>
            </HStack>
            {poesAbierto ? <FiChevronUp /> : <FiChevronDown />}
          </Button>

          {poesAbierto && (
            <VStack align="stretch" gap={1.5} mt={2} pl={2} pr={1} pb={1}>
              {pasosPoes.map((instruccion, idx) => (
                <Text key={idx} fontSize="2xs" color="gray.600" lineHeight="short">
                  <Box as="span" fontWeight="bold" color="blue.600" mr={1}>
                    {idx + 1}.
                  </Box>
                  {instruccion}
                </Text>
              ))}
            </VStack>
          )}
        </Box>
      )}

      <Separator my={3} borderColor="gray.200" />

      {/* Lista de Insumos Químicos con sus consumos */}
      <VStack align="stretch" gap={2.5} w="100%">
        {tarea.insumos_quimicos.length > 0 && (
          <Box bg="gray.50" p={2.5} borderRadius="md" border="1px solid" borderColor="gray.200">
            <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={2}>
              Registro de Insumos Químicos:
            </Text>
            <VStack align="stretch" gap={2}>
              {tarea.insumos_quimicos.map((item) => (
                <Flex
                  key={item.insumo_quimico.id}
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  gap={2}
                >
                  <Text fontSize="xs" color="gray.700">
                    <strong>{item.insumo_quimico.nombre}</strong>{" "}
                    {item.dilucion_especifica && (
                      <Box as="span" color="gray.500">({item.dilucion_especifica})</Box>
                    )}
                  </Text>
                  <HStack gap={1.5}>
                    <Text fontSize="xs" color="gray.500">Consumo:</Text>
                    <Input
                      size="xs"
                      w="55px"
                      textAlign="center"
                      type="number"
                      min={0}
                      step="any"
                      value={consumos[item.insumo_quimico.id] ?? ""}
                      onChange={(e) => handleCambioConsumo(item.insumo_quimico.id, e.target.value)}
                      bg="white"
                      borderRadius="md"
                      disabled={isSubmitting}
                      css={{
                        "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                          display: "none",
                        },
                        "&": {
                          MozAppearance: "textfield",
                        },
                      }}
                    />
                    <Text fontSize="xs" color="gray.600">
                      [{item.insumo_quimico.unidad_medida.simbolo}]
                    </Text>
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>
        )}

        {/* Barra de acciones: Observación + Adjuntar Foto + Marcar Realizada */}
        <Flex
          direction={{ base: "column", sm: "row" }}
          gap={2}
          w="100%"
          justify="flex-end"
          align={{ sm: "center" }}
          pt={1}
        >
          {/* Campo de texto de observación (al lado del botón de foto) */}
          <Input
            placeholder="Añadir observación (opcional)..."
            size="sm"
            fontSize="xs"
            borderRadius="md"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            w={{ base: "100%", sm: "240px" }}
            bg="white"
            disabled={isSubmitting}
          />

          <Button
            size="sm"
            variant={fotoSeleccionada ? "solid" : "outline"}
            colorScheme={fotoSeleccionada ? "teal" : "gray"}
            onClick={() => onAbrirModalFoto(ejecucion)}
            borderRadius="md"
            fontSize="xs"
            w={{ base: "100%", sm: "auto" }}
            disabled={isSubmitting}
          >
            <FiCamera style={{ marginRight: "6px" }} />
            {fotoSeleccionada ? "Foto lista ✓" : "Adjuntar Foto (Opcional)"}
          </Button>

          <Button
            size="sm"
            colorScheme="green"
            bg="green.600"
            _hover={{ bg: "green.700" }}
            color="white"
            onClick={handleMarcarRealizada}
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
            w={{ base: "100%", sm: "auto" }}
            loading={isSubmitting}
            loadingText="Guardando..."
          >
            <FiCheck style={{ marginRight: "6px" }} />
            Marcar como realizada
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}
