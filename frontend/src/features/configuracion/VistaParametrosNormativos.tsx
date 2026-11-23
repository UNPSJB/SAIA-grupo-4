import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Switch,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiEdit3,
  FiPlusCircle,
  FiRefreshCw,
  FiShield,
  FiXCircle,
} from "react-icons/fi";
import { AlertConfirm, AlertMessage, LoadingState } from "../../components/ui";
import {
  actualizarModuloOctogonos,
  crearVersionParametrosFrontales,
  obtenerParametrosFrontales,
} from "./configuracionApi";
import type {
  ParametrosFrontalesConsolidado,
  ReglaUmbralFrontal,
} from "./types";

const formatearFechaHora = (iso: string | null) => {
  if (!iso) return "En vigencia";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const VistaParametrosNormativos = () => {
  const [datos, setDatos] = useState<ParametrosFrontalesConsolidado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoModulo, setGuardandoModulo] = useState(false);
  const [guardandoVersion, setGuardandoVersion] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [confirmarDesactivarOpen, setConfirmarDesactivarOpen] = useState(false);
  const [confirmarPublicarOpen, setConfirmarPublicarOpen] = useState(false);

  const [reglasEditables, setReglasEditables] = useState<ReglaUmbralFrontal[]>([]);
  const [normativaReferencia, setNormativaReferencia] = useState("");
  const [motivoCambio, setMotivoCambio] = useState("");
  const [observacionModulo, setObservacionModulo] = useState("");

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const cargarParametros = useCallback(async () => {
    setCargando(true);
    setMensajeError(null);
    try {
      const res = await obtenerParametrosFrontales();
      setDatos(res);
      setReglasEditables(res.version_vigente.reglas.map((r) => ({ ...r })));
      setNormativaReferencia(res.version_vigente.normativa_referencia);
      setObservacionModulo(res.modulo.observacion ?? "");
    } catch (err) {
      setMensajeError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los parámetros normativos.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarParametros();
  }, [cargarParametros]);

  const ejecutarCambioModulo = async (nuevoEstado: boolean) => {
    setGuardandoModulo(true);
    setMensajeError(null);
    setMensajeExito(null);
    try {
      const moduloActualizado = await actualizarModuloOctogonos({
        octogonos_activos: nuevoEstado,
        observacion: observacionModulo.trim() || null,
      });
      setDatos((prev) =>
        prev ? { ...prev, modulo: moduloActualizado } : prev,
      );
      setMensajeExito(
        nuevoEstado
          ? "Módulo de rotulado frontal (octógonos) activado."
          : "Módulo de rotulado frontal desactivado para el establecimiento.",
      );
    } catch (err) {
      setMensajeError(
        err instanceof Error
          ? err.message
          : "Error al actualizar el estado del módulo de octógonos.",
      );
    } finally {
      setGuardandoModulo(false);
      setConfirmarDesactivarOpen(false);
    }
  };

  const handleToggleSwitch = (checked: boolean) => {
    if (!checked) {
      setConfirmarDesactivarOpen(true);
      return;
    }
    void ejecutarCambioModulo(true);
  };

  const handleCambiarUmbral = (index: number, nuevoValor: string) => {
    const numero = Number(nuevoValor);
    setReglasEditables((prev) =>
      prev.map((regla, idx) =>
        idx === index ? { ...regla, valor_umbral: numero } : regla,
      ),
    );
  };

  const handleIniciarNuevaVersion = () => {
    if (!datos) return;
    setReglasEditables(datos.version_vigente.reglas.map((r) => ({ ...r })));
    setNormativaReferencia(datos.version_vigente.normativa_referencia);
    setMotivoCambio("");
    setMensajeError(null);
    setMensajeExito(null);
    setModoEdicion(true);
  };

  const handleCancelarEdicion = () => {
    if (datos) {
      setReglasEditables(datos.version_vigente.reglas.map((r) => ({ ...r })));
      setNormativaReferencia(datos.version_vigente.normativa_referencia);
    }
    setMotivoCambio("");
    setModoEdicion(false);
  };

  const handleGuardarNuevaVersion = async () => {
    setConfirmarPublicarOpen(false);
    setMensajeError(null);
    setMensajeExito(null);

    if (!normativaReferencia.trim()) {
      setMensajeError("La normativa de referencia es obligatoria.");
      return;
    }

    const umbralInvalido = reglasEditables.some(
      (r) => Number.isNaN(r.valor_umbral) || r.valor_umbral <= 0,
    );
    if (umbralInvalido) {
      setMensajeError("Todos los valores de umbral deben ser mayores a cero.");
      return;
    }

    setGuardandoVersion(true);
    try {
      const actualizado = await crearVersionParametrosFrontales({
        normativa_referencia: normativaReferencia.trim(),
        motivo_cambio: motivoCambio.trim() || null,
        reglas: reglasEditables.map((r) => ({
          nutriente_critico: r.nutriente_critico,
          leyenda_sello: r.leyenda_sello,
          categoria: r.categoria,
          valor_umbral: Number(r.valor_umbral),
          unidad_umbral: r.unidad_umbral,
          condicion: r.condicion,
        })),
      });
      setDatos(actualizado);
      setReglasEditables(
        actualizado.version_vigente.reglas.map((r) => ({ ...r })),
      );
      setModoEdicion(false);
      setMotivoCambio("");
      setMensajeExito(
        `Se publicó correctamente la Versión #${actualizado.version_vigente.numero_version}. La versión anterior fue archivada en el historial.`,
      );
    } catch (err) {
      setMensajeError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la nueva versión normativa.",
      );
    } finally {
      setGuardandoVersion(false);
    }
  };

  if (cargando) {
    return <LoadingState message="Cargando parámetros normativos..." />;
  }

  if (!datos) {
    return (
      <VStack align="stretch" gap={4}>
        <AlertMessage
          type="error"
          message={
            mensajeError ?? "No se pudieron cargar los parámetros normativos."
          }
        />
        <Box>
          <Button colorPalette="green" onClick={() => void cargarParametros()}>
            <Icon as={FiRefreshCw} />
            Reintentar
          </Button>
        </Box>
      </VStack>
    );
  }

  const { modulo, version_vigente: vigente, historial } = datos;

  const hayCambiosVersion =
    normativaReferencia.trim() !== vigente.normativa_referencia ||
    reglasEditables.some(
      (r, idx) => Number(r.valor_umbral) !== vigente.reglas[idx]?.valor_umbral,
    );

  return (
    <VStack align="stretch" gap={6}>
      {mensajeExito && <AlertMessage type="success" message={mensajeExito} />}
      {mensajeError && <AlertMessage type="error" message={mensajeError} />}

      {/* 1. Card de Aplicabilidad del Módulo de Octógonos */}
      <Card.Root variant="outline" bg="white" shadow="xs">
        <Card.Body>
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            gap={4}
          >
            <HStack align="flex-start" gap={3}>
              <Box
                p={2.5}
                borderRadius="lg"
                bg={modulo.octogonos_activos ? "green.50" : "gray.100"}
                color={modulo.octogonos_activos ? "green.600" : "gray.500"}
              >
                <Icon as={FiShield} boxSize={6} />
              </Box>
              <Box>
                <HStack gap={2} wrap="wrap">
                  <Heading size="md" color="gray.800">
                    Aplicabilidad de Rotulado Frontal (Octógonos Ley 27.642)
                  </Heading>
                  <Badge
                    colorPalette={modulo.octogonos_activos ? "green" : "gray"}
                    variant="subtle"
                  >
                    {modulo.octogonos_activos ? "ACTIVO" : "NO APLICA / INACTIVO"}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Si el establecimiento elabora únicamente productos exceptuados
                  o insumos industriales (B2B), podés desactivar la evaluación de
                  sellos de advertencia sin afectar el cálculo de la tabla
                  nutricional.
                </Text>
              </Box>
            </HStack>

            <Switch.Root
              colorPalette="green"
              size="lg"
              checked={modulo.octogonos_activos}
              disabled={guardandoModulo}
              onCheckedChange={(e) => handleToggleSwitch(e.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontWeight="semibold" fontSize="sm">
                {modulo.octogonos_activos ? "Habilitado" : "Deshabilitado"}
              </Switch.Label>
            </Switch.Root>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* 2. Card de Versión Vigente y Grilla de Umbrales */}
      <Card.Root variant="outline" bg="white" shadow="xs">
        <Card.Header pb={2}>
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            gap={3}
          >
            <Box>
              <HStack gap={2} wrap="wrap">
                <Heading size="md" color="gray.800">
                  Parámetros Normativos Vigentes
                </Heading>
                <Badge colorPalette="green" variant="solid">
                  Versión #{vigente.numero_version} · {vigente.estado}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600" mt={1}>
                <strong>Normativa:</strong> {vigente.normativa_referencia} ·{" "}
                <strong>Vigente desde:</strong>{" "}
                {formatearFechaHora(vigente.fecha_vigencia_desde)} ·{" "}
                <strong>Autor:</strong>{" "}
                {vigente.creado_por_nombre || "Sistema (Inicialización)"}
              </Text>
            </Box>

            {!modoEdicion ? (
              <Button
                colorPalette="green"
                size="sm"
                onClick={handleIniciarNuevaVersion}
              >
                <Icon as={FiEdit3} />
                Nueva versión de umbrales
              </Button>
            ) : (
              <HStack gap={2}>
                <Button
                  variant="outline"
                  colorPalette="red"
                  size="sm"
                  disabled={guardandoVersion}
                  onClick={handleCancelarEdicion}
                >
                  <Icon as={FiXCircle} />
                  Cancelar
                </Button>
                <Button
                  colorPalette="green"
                  size="sm"
                  loading={guardandoVersion}
                  disabled={!hayCambiosVersion}
                  onClick={() => setConfirmarPublicarOpen(true)}
                >
                  <Icon as={FiPlusCircle} />
                  Publicar Versión #{vigente.numero_version + 1}
                </Button>
              </HStack>
            )}
          </Flex>
        </Card.Header>

        <Card.Body pt={3}>
          {modoEdicion && (
            <Box
              p={4}
              mb={4}
              bg="green.50"
              borderWidth="1px"
              borderColor="green.200"
              borderRadius="md"
            >
              <Text fontSize="sm" fontWeight="bold" color="green.800" mb={3}>
                Datos de auditoría para la nueva Versión #
                {vigente.numero_version + 1} (la Versión #{vigente.numero_version}{" "}
                quedará archivada e inmutable)
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={1}>
                    Normativa de referencia *
                  </Text>
                  <Input
                    bg="white"
                    size="sm"
                    value={normativaReferencia}
                    onChange={(e) => setNormativaReferencia(e.target.value)}
                    placeholder="Ej. Ley 27.642 - Disposición ANMAT 2026"
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={1}>
                    Motivo de la actualización
                  </Text>
                  <Textarea
                    bg="white"
                    size="sm"
                    rows={1}
                    value={motivoCambio}
                    onChange={(e) => setMotivoCambio(e.target.value)}
                    placeholder="Ej. Actualización de etapa ANMAT / ajuste de criterio"
                  />
                </Box>
              </SimpleGrid>
            </Box>
          )}

          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Categoría</Table.ColumnHeader>
                  <Table.ColumnHeader>Nutriente / Sello</Table.ColumnHeader>
                  <Table.ColumnHeader width="150px">
                    Valor Umbral
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                  <Table.ColumnHeader>Condición normativa</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {reglasEditables.map((regla, idx) => (
                  <Table.Row key={`${regla.categoria}-${regla.nutriente_critico}-${idx}`}>
                    <Table.Cell>
                      <Badge
                        colorPalette={
                          regla.categoria === "ALIMENTO" ? "teal" : "blue"
                        }
                        variant="subtle"
                      >
                        {regla.categoria}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontWeight="semibold" fontSize="xs">
                        {regla.leyenda_sello}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        {regla.nutriente_critico}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {modoEdicion ? (
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          size="xs"
                          value={regla.valor_umbral}
                          onChange={(e) =>
                            handleCambiarUmbral(idx, e.target.value)
                          }
                        />
                      ) : (
                        <Text fontWeight="bold" color="green.700">
                          {regla.valor_umbral}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.700">
                      {regla.unidad_umbral}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.600">
                      {regla.condicion ?? "—"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card.Body>
      </Card.Root>

      {/* 3. Card de Historial de Versiones Anteriores (Solo Lectura) */}
      <Card.Root variant="outline" bg="white" shadow="xs">
        <Card.Header pb={2}>
          <HStack gap={2}>
            <Icon as={FiClock} color="green.600" />
            <Heading size="md" color="gray.800">
              Historial de Versiones Normativas ({historial.length})
            </Heading>
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Las versiones históricas son inmutables para conservar la
            trazabilidad de los cálculos nutricionales emitidos en cada período.
          </Text>
        </Card.Header>
        <Card.Body pt={2}>
          {historial.length === 0 ? (
            <HStack
              p={4}
              bg="gray.50"
              borderRadius="md"
              color="gray.600"
              gap={2}
            >
              <Icon as={FiCheckCircle} color="green.500" />
              <Text fontSize="sm">
                No existen versiones históricas archivadas. La Versión #1 inicial
                se encuentra vigente.
              </Text>
            </HStack>
          ) : (
            <VStack align="stretch" gap={3}>
              {historial.map((ver) => (
                <Collapsible.Root key={ver.id}>
                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={3}
                  >
                    <Collapsible.Trigger asChild>
                      <Flex
                        justify="space-between"
                        align="center"
                        cursor="pointer"
                        gap={2}
                        wrap="wrap"
                      >
                        <VStack align="start" gap={0.5}>
                          <HStack gap={2}>
                            <Badge colorPalette="gray" variant="subtle">
                              Versión #{ver.numero_version} · {ver.estado}
                            </Badge>
                            <Text fontWeight="bold" fontSize="sm">
                              {ver.normativa_referencia}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            Vigencia:{" "}
                            {formatearFechaHora(ver.fecha_vigencia_desde)} hasta{" "}
                            {formatearFechaHora(ver.fecha_vigencia_hasta)} ·
                            Autor: {ver.creado_por_nombre || "Sistema"}
                            {ver.motivo_cambio
                              ? ` · Motivo: ${ver.motivo_cambio}`
                              : ""}
                          </Text>
                        </VStack>
                        <HStack gap={1} color="green.700" fontSize="xs">
                          <Text fontWeight="semibold">Ver umbrales</Text>
                          <Icon as={FiChevronDown} />
                        </HStack>
                      </Flex>
                    </Collapsible.Trigger>

                    <Collapsible.Content>
                      <Box mt={3} overflowX="auto">
                        <Table.Root size="sm" variant="line">
                          <Table.Header bg="gray.50">
                            <Table.Row>
                              <Table.ColumnHeader>Categoría</Table.ColumnHeader>
                              <Table.ColumnHeader>Sello</Table.ColumnHeader>
                              <Table.ColumnHeader>Umbral</Table.ColumnHeader>
                              <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {ver.reglas.map((r, i) => (
                              <Table.Row key={i}>
                                <Table.Cell fontSize="xs">
                                  {r.categoria}
                                </Table.Cell>
                                <Table.Cell fontSize="xs">
                                  {r.leyenda_sello}
                                </Table.Cell>
                                <Table.Cell fontSize="xs" fontWeight="bold">
                                  {r.valor_umbral}
                                </Table.Cell>
                                <Table.Cell fontSize="xs">
                                  {r.unidad_umbral}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </Collapsible.Content>
                  </Box>
                </Collapsible.Root>
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>

      <AlertConfirm
        open={confirmarPublicarOpen}
        title={`Publicar Versión #${vigente.numero_version + 1}`}
        message={`¿Confirmás publicar la nueva versión normativa? La Versión #${vigente.numero_version} quedará archivada en el historial. Las recetas en borrador y activas sin lotes adoptarán los nuevos umbrales, mientras que las recetas con lotes asociados o inhabilitadas conservarán la versión anterior.`}
        confirmLabel={`Publicar Versión #${vigente.numero_version + 1}`}
        loading={guardandoVersion}
        onConfirm={() => void handleGuardarNuevaVersion()}
        onCancel={() => setConfirmarPublicarOpen(false)}
      />

      <AlertConfirm
        open={confirmarDesactivarOpen}
        title="Desactivar evaluación de octógonos"
        message="Al desactivar este módulo, el sistema ocultará la evaluación de sellos de advertencia (Ley 27.642) en las fichas técnicas de productos elaborados, manteniendo únicamente la tabla nutricional. ¿Deseás continuar?"
        loading={guardandoModulo}
        onConfirm={() => void ejecutarCambioModulo(false)}
        onCancel={() => setConfirmarDesactivarOpen(false)}
      />
    </VStack>
  );
};