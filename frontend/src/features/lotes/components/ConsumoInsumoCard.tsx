import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiLayers, FiPlus, FiTrash2 } from "react-icons/fi";
import type { InsumoTeoricoReceta } from "../types";

export interface AsignacionLoteForm {
  lote_insumo_id: string;
  cantidad: string;
}

interface ConsumoInsumoCardProps {
  insumo: InsumoTeoricoReceta;
  cantidadTeorica: number;
  cantidadReal: string;
  asignaciones: AsignacionLoteForm[];
  onCambioCantidadReal: (valor: string) => void;
  onCambioAsignaciones: (nuevas: AsignacionLoteForm[]) => void;
  disabled?: boolean;
}

const EPS = 0.0001;

const redondear3 = (n: number) => Math.round(n * 1000) / 1000;

const formatearNumero = (n: number) =>
  Number(n).toLocaleString("es-AR", { maximumFractionDigits: 3 });

const formatearFechaCorta = (isoDate: string) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
};

const esTeclaDecimalValida = (
  e: React.KeyboardEvent<HTMLInputElement>,
  valorActual: string,
) => {
  if (
    [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(e.key)
  ) {
    return true;
  }
  if (e.ctrlKey || e.metaKey) return true;
  if ((e.key === "." || e.key === ",") && !valorActual.includes(".")) return true;
  return /^[0-9]$/.test(e.key);
};

const sanitizarDecimal = (val: string) => {
  const sanitizado = val.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const partes = sanitizado.split(".");
  return partes.length > 2
    ? `${partes[0]}.${partes.slice(1).join("")}`
    : sanitizado;
};

export function ConsumoInsumoCard({
  insumo,
  cantidadTeorica,
  cantidadReal,
  asignaciones,
  onCambioCantidadReal,
  onCambioAsignaciones,
  disabled = false,
}: ConsumoInsumoCardProps) {
  const cantRealNum = parseFloat(cantidadReal);
  const cantRealValida = !isNaN(cantRealNum) && cantRealNum >= 0 ? cantRealNum : 0;
  const esCero = !isNaN(cantRealNum) && cantRealNum === 0;
  const difiere = !isNaN(cantRealNum) && Math.abs(cantRealNum - cantidadTeorica) > EPS;

  const lotesDisponibles = insumo.lotes_disponibles ?? [];

  const sumaAsignada = asignaciones.reduce((acc, a) => {
    const n = parseFloat(a.cantidad);
    return acc + (!isNaN(n) && n > 0 ? n : 0);
  }, 0);

  const diferencia = redondear3(sumaAsignada - cantRealValida);
  const tieneAlgunLoteValido = asignaciones.some(
    (a) => Boolean(a.lote_insumo_id) && parseFloat(a.cantidad) > 0,
  );
  const estaBalanceado = esCero
    ? asignaciones.length === 0
    : cantRealValida > 0 && tieneAlgunLoteValido && Math.abs(diferencia) <= EPS;

  const handleAgregarFila = () => {
    const idsUsados = new Set(asignaciones.map((a) => a.lote_insumo_id).filter(Boolean));
    const siguienteLote = lotesDisponibles.find((l) => !idsUsados.has(String(l.id)));
    const faltante = Math.max(0, redondear3(cantRealValida - sumaAsignada));
    const sugerido =
      siguienteLote && faltante > 0
        ? String(redondear3(Math.min(faltante, Number(siguienteLote.cantidad_actual))))
        : faltante > 0
          ? String(faltante)
          : "";

    onCambioAsignaciones([
      ...asignaciones,
      {
        lote_insumo_id: siguienteLote ? String(siguienteLote.id) : "",
        cantidad: sugerido,
      },
    ]);
  };

  const handleActualizarFila = (
    index: number,
    campo: keyof AsignacionLoteForm,
    valor: string,
  ) => {
    const nuevas = asignaciones.map((fila, idx) =>
      idx === index ? { ...fila, [campo]: valor } : fila,
    );
    onCambioAsignaciones(nuevas);
  };

  const handleEliminarFila = (index: number) => {
    onCambioAsignaciones(asignaciones.filter((_, idx) => idx !== index));
  };

  const colorBordeIzq = esCero
    ? "gray.400"
    : estaBalanceado
      ? difiere
        ? "orange.400"
        : "green.500"
      : "red.500";

  return (
    <Box
      bg="white"
      p={{ base: 3, md: 4 }}
      borderRadius="xl"
      boxShadow="xs"
      border="1px solid"
      borderColor="gray.200"
      borderLeft="4px solid"
      borderLeftColor={colorBordeIzq}
      w="100%"
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
        <HStack gap={2} align="center">
          <FiLayers color="#319795" size={16} />
          <Text fontWeight="bold" fontSize="sm" color="gray.800">
            {insumo.nombre}
          </Text>
        </HStack>
        <HStack gap={1.5} wrap="wrap">
          <Badge colorPalette="gray" variant="subtle" fontSize="2xs">
            Estimado: {formatearNumero(cantidadTeorica)} {insumo.unidad_medida_simbolo}
          </Badge>
          {difiere && (
            <Badge colorPalette="orange" variant="outline" fontSize="2xs">
              Ajustado
            </Badge>
          )}
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center" gap={3} mb={3}>
        <Text fontSize="xs" color="gray.600">
          Consumo real utilizado:
        </Text>
        <HStack gap={1.5} align="center">
          <Input
            type="text"
            inputMode="decimal"
            size="sm"
            w={{ base: "110px", md: "130px" }}
            textAlign="right"
            fontWeight="bold"
            value={cantidadReal}
            onKeyDown={(e) => {
              if (!esTeclaDecimalValida(e, cantidadReal)) e.preventDefault();
            }}
            onChange={(e) => onCambioCantidadReal(sanitizarDecimal(e.target.value))}
            disabled={disabled}
            placeholder={String(cantidadTeorica)}
            borderRadius="md"
            bg="gray.50"
          />
          <Text fontSize="xs" fontWeight="semibold" color="gray.600" minW="25px">
            {insumo.unidad_medida_simbolo}
          </Text>
        </HStack>
      </Flex>

      {/* Sección multi-lote */}
      {esCero ? (
        <Box bg="gray.50" px={3} py={2} borderRadius="md" border="1px dashed" borderColor="gray.200">
          <Text fontSize="xs" color="gray.500">
            Sin consumo real declarado (0 {insumo.unidad_medida_simbolo}): no se descontará ningún lote físico.
          </Text>
        </Box>
      ) : (
        <Box bg="gray.50" p={2.5} borderRadius="lg" border="1px solid" borderColor="gray.200">
          <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.700">
              Lotes físicos asignados
            </Text>
            {estaBalanceado ? (
              <Badge colorPalette="green" variant="subtle" fontSize="2xs">
                Balanceado ({formatearNumero(sumaAsignada)} / {formatearNumero(cantRealValida)}{" "}
                {insumo.unidad_medida_simbolo})
              </Badge>
            ) : diferencia < -EPS ? (
              <Badge colorPalette="orange" variant="subtle" fontSize="2xs">
                Faltan {formatearNumero(Math.abs(diferencia))} {insumo.unidad_medida_simbolo}
              </Badge>
            ) : (
              <Badge colorPalette="red" variant="subtle" fontSize="2xs">
                Exceso +{formatearNumero(diferencia)} {insumo.unidad_medida_simbolo}
              </Badge>
            )}
          </Flex>

          {lotesDisponibles.length === 0 ? (
            <Text fontSize="xs" color="red.600" fontWeight="medium">
              No hay lotes activos, vigentes y con stock disponible para este insumo.
            </Text>
          ) : (
            <VStack gap={2} align="stretch">
              {asignaciones.map((asig, idx) => {
                const loteSel = lotesDisponibles.find(
                  (l) => String(l.id) === asig.lote_insumo_id,
                );
                const cantAsigNum = parseFloat(asig.cantidad);
                const superaStock =
                  loteSel != null &&
                  !isNaN(cantAsigNum) &&
                  cantAsigNum > Number(loteSel.cantidad_actual) + EPS;
                const duplicado = Boolean(
                  asig.lote_insumo_id &&
                    asignaciones.filter((a) => a.lote_insumo_id === asig.lote_insumo_id)
                      .length > 1,
                );

                return (
                  <Box key={idx} minW={0}>
                    <Flex
                      direction={{ base: "column", md: "row" }}
                      gap={2}
                      align={{ base: "stretch", md: "center" }}
                      minW={0}
                    >
                      <NativeSelect.Root
                        size="sm"
                        w="full"
                        flex={{ md: "1" }}
                        minW={0}
                        disabled={disabled}
                      >
                        <NativeSelect.Field
                          bg="white"
                          w="full"
                          minW={0}
                          overflow="hidden"
                          textOverflow="ellipsis"
                          value={asig.lote_insumo_id}
                          onChange={(e) =>
                            handleActualizarFila(idx, "lote_insumo_id", e.target.value)
                          }
                        >
                          <option value="">Seleccione un lote...</option>
                          {lotesDisponibles
                            .filter(
                              (l) =>
                                String(l.id) === asig.lote_insumo_id ||
                                !asignaciones.some(
                                  (a, otherIdx) =>
                                    otherIdx !== idx && a.lote_insumo_id === String(l.id),
                                ),
                            )
                            .map((l) => (
                              <option key={l.id} value={String(l.id)}>
                                {l.codigo_lote} — Disp: {formatearNumero(l.cantidad_actual)}{" "}
                                {insumo.unidad_medida_simbolo} (Vto:{" "}
                                {formatearFechaCorta(l.fecha_vencimiento)})
                              </option>
                            ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>

                      <Flex
                        gap={1.5}
                        align="center"
                        justify={{ base: "flex-end", md: "flex-start" }}
                        flexShrink={0}
                      >
                        <Input
                          type="text"
                          inputMode="decimal"
                          size="sm"
                          flex={{ base: "1", md: "initial" }}
                          maxW={{ base: "150px", md: "100px" }}
                          w={{ base: "full", md: "100px" }}
                          bg="white"
                          textAlign="right"
                          fontWeight="semibold"
                          borderColor={superaStock ? "red.400" : undefined}
                          value={asig.cantidad}
                          onKeyDown={(e) => {
                            if (!esTeclaDecimalValida(e, asig.cantidad)) e.preventDefault();
                          }}
                          onChange={(e) =>
                            handleActualizarFila(
                              idx,
                              "cantidad",
                              sanitizarDecimal(e.target.value),
                            )
                          }
                          disabled={disabled}
                          placeholder="0"
                        />
                        <Text fontSize="xs" color="gray.600" minW="22px" flexShrink={0}>
                          {insumo.unidad_medida_simbolo}
                        </Text>
                        <IconButton
                          aria-label="Quitar lote"
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          flexShrink={0}
                          onClick={() => handleEliminarFila(idx)}
                          disabled={disabled}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </Flex>
                    </Flex>

                    {(superaStock || duplicado) && (
                      <Text fontSize="2xs" color="red.600" mt={1}>
                        {duplicado
                          ? "Este lote ya fue seleccionado en otra fila."
                          : `Supera el stock disponible (${formatearNumero(loteSel!.cantidad_actual)} ${insumo.unidad_medida_simbolo}).`}
                      </Text>
                    )}
                  </Box>
                );
              })}

              <Box>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  colorPalette="teal"
                  onClick={handleAgregarFila}
                  disabled={disabled || asignaciones.length >= lotesDisponibles.length}
                >
                  <FiPlus />
                  Agregar lote
                </Button>
              </Box>
            </VStack>
          )}
        </Box>
      )}
    </Box>
  );
}
