import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Badge,
  Box,
  Field,
  Flex,
  HStack,
  IconButton,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiBox,
  FiRefreshCw,
  FiSave,
  FiXCircle,
} from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  LoadingState,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "../../components/ui";
import { lotesApi } from "./hooks/lotesApi";
import { ConsumoInsumoCard } from "./components/ConsumoInsumoCard";
import type { ProductoDisponibleLote } from "./types";

interface RegistrarLoteFormProps {
  onSuccess?: () => void;
  onCancelar?: () => void;
}

export const RegistrarLoteForm = ({ onSuccess, onCancelar }: RegistrarLoteFormProps) => {
  const [productos, setProductos] = useState<ProductoDisponibleLote[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [productoId, setProductoId] = useState<number | null>(null);
  const [codigoLote, setCodigoLote] = useState("");
  const [generandoCodigo, setGenerandoCodigo] = useState(false);

  // Funciones auxiliares para obtener la fecha y hora local exacta sin desfases de zona horaria
  const pad = (n: number) => String(n).padStart(2, "0");
  const obtenerFechaLocal = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const obtenerFechaHoraLocal = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const calcularVencimientoLocal = (fechaStr: string, dias: number) => {
    const [y, m, day] = fechaStr.slice(0, 10).split("-").map(Number);
    if (!y || !m || !day) return "";
    const d = new Date(y, m - 1, day);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + dias);
    return obtenerFechaLocal(d);
  };

  // Fecha del día de hoy (YYYY-MM-DD local) para restringir elaboración futura
  const hoyFechaStr = useMemo(() => obtenerFechaLocal(), []);

  // Fecha y hora de elaboración por defecto (exacta local del sistema)
  const [fechaElaboracion, setFechaElaboracion] = useState<string>(() => obtenerFechaHoraLocal());

  // Fecha de vencimiento (YYYY-MM-DD)
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");

  // Cantidad producida
  const [cantidadProducida, setCantidadProducida] = useState<string>("");

  // Consumos reales ingresados por el operador (indexados por insumo_id)
  const [consumosReales, setConsumosReales] = useState<Record<number, string>>({});
  // Registro de insumos editados manualmente por el operador para no sobreescribir si recalcula
  const [insumosModificadosManual, setInsumosModificadosManual] = useState<Record<number, boolean>>({});

  const [observaciones, setObservaciones] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exitoMsg, setExitoMsg] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Carga inicial de productos con receta activa
  useEffect(() => {
    const cargar = async () => {
      setCargandoProductos(true);
      setErrorCarga("");
      try {
        const datos = await lotesApi.getProductosDisponibles();
        setProductos(datos);
      } catch (err: any) {
        setErrorCarga(err.message || "Error al cargar productos con receta activa.");
      } finally {
        setCargandoProductos(false);
      }
    };
    cargar();
  }, []);

  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === productoId) || null;
  }, [productos, productoId]);

  // Autocalcular sugerencia de código de lote
  const generarSugerenciaCodigo = useCallback(
    async (pId: number, fechaStr: string) => {
      setGenerandoCodigo(true);
      try {
        const fechaSolo = fechaStr.slice(0, 10);
        const { codigo_lote } = await lotesApi.sugerirCodigoLote(pId, fechaSolo);
        setCodigoLote(codigo_lote);
      } catch {
        // Silencioso, el operador puede escribirlo
      } finally {
        setGenerandoCodigo(false);
      }
    },
    [],
  );

  // Al seleccionar un producto:
  // 1. Precargar cantidad producida con rendimiento estándar de la receta
  // 2. Autocalcular fecha de vencimiento si producto tiene dias_vida_util
  // 3. Autogenerar sugerencia de código de lote
  // 4. Inicializar consumos reales con las cantidades teóricas iniciales
  const handleSeleccionarProducto = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      setProductoId(null);
      setCodigoLote("");
      setFechaVencimiento("");
      setCantidadProducida("");
      setConsumosReales({});
      setInsumosModificadosManual({});
      return;
    }

    const prod = productos.find((p) => p.id === id);
    if (!prod) return;

    setProductoId(id);
    setErrorEnvio("");
    setExitoMsg("");

    // 1. Rendimiento estándar
    const rendimiento = Number(prod.rendimiento_estandar) || 1;
    setCantidadProducida(String(rendimiento));

    // 2. Vencimiento según vida útil
    if (prod.dias_vida_util) {
      setFechaVencimiento(calcularVencimientoLocal(fechaElaboracion, prod.dias_vida_util));
    } else {
      setFechaVencimiento("");
    }

    // 3. Sugerencia de código
    generarSugerenciaCodigo(id, fechaElaboracion);

    // 4. Insumos iniciales (factor 1.0)
    const iniciales: Record<number, string> = {};
    prod.insumos_teoricos.forEach((ins) => {
      iniciales[ins.insumo_id] = String(ins.cantidad_nominal_receta);
    });
    setConsumosReales(iniciales);
    setInsumosModificadosManual({});
  };

  // Factor de escala proporcional: cantidad_producida / rendimiento_estandar
  const factorEscala = useMemo(() => {
    if (!productoSeleccionado) return 1.0;
    const cantNum = parseFloat(cantidadProducida);
    const rendNum = Number(productoSeleccionado.rendimiento_estandar);
    if (isNaN(cantNum) || cantNum <= 0 || isNaN(rendNum) || rendNum <= 0) {
      return 1.0;
    }
    return cantNum / rendNum;
  }, [cantidadProducida, productoSeleccionado]);

  // Cuando cambia cantidad producida, recalcular cantidades teóricas y actualizar
  // consumos reales para aquellos insumos que el operador NO haya editado manualmente
  const handleCambioCantidadProducida = (valor: string) => {
    setCantidadProducida(valor);
    if (!productoSeleccionado) return;

    const cantNum = parseFloat(valor);
    const rendNum = Number(productoSeleccionado.rendimiento_estandar);
    const factor = !isNaN(cantNum) && cantNum > 0 && !isNaN(rendNum) && rendNum > 0
      ? cantNum / rendNum
      : 1.0;

    setConsumosReales((prev) => {
      const actualizados = { ...prev };
      productoSeleccionado.insumos_teoricos.forEach((ins) => {
        // Si el operador no lo modificó manualmente, se escala automáticamente
        if (!insumosModificadosManual[ins.insumo_id]) {
          const teorica = Math.round(ins.cantidad_nominal_receta * factor * 100) / 100;
          actualizados[ins.insumo_id] = String(teorica);
        }
      });
      return actualizados;
    });
  };

  // Cuando el operador edita la cantidad real de un insumo
  const handleCambioConsumoReal = (insumoId: number, valor: string) => {
    setConsumosReales((prev) => ({ ...prev, [insumoId]: valor }));
    setInsumosModificadosManual((prev) => ({ ...prev, [insumoId]: true }));
  };

  // Validación y guardado directo de lote (sin modal de confirmación)
  const handleSubmitLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio("");
    setExitoMsg("");

    const errs: Record<string, string> = {};

    if (!productoSeleccionado) {
      errs.producto = "Debe seleccionar un producto con receta activa.";
    }
    if (!codigoLote.trim()) {
      errs.codigoLote = "Debe ingresar o autogenerar el código de lote.";
    }
    if (!fechaElaboracion) {
      errs.fechaElaboracion = "Debe ingresar la fecha y hora de elaboración.";
    }
    const fechaElabSoloDia = fechaElaboracion ? fechaElaboracion.slice(0, 10) : "";
    if (fechaElabSoloDia && fechaElabSoloDia > hoyFechaStr) {
      errs.fechaElaboracion = "La fecha de elaboración no puede ser posterior al día de hoy.";
    }
    if (!fechaVencimiento) {
      errs.fechaVencimiento = "Debe ingresar la fecha de vencimiento.";
    } else if (fechaElabSoloDia && fechaVencimiento < fechaElabSoloDia) {
      errs.fechaVencimiento = "La fecha de vencimiento no puede ser anterior a la fecha de elaboración.";
    }
    const cantNum = parseFloat(cantidadProducida);
    if (isNaN(cantNum) || cantNum <= 0) {
      errs.cantidadProducida = "Debe ingresar una cantidad mayor a cero.";
    }

    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      setErrorEnvio("Por favor, revise los campos marcados antes de guardar.");
      return;
    }

    setErrores({});
    setGuardando(true);

    try {
      const payloadConsumos = (productoSeleccionado?.insumos_teoricos ?? []).map((ins) => {
        const valReal = parseFloat(consumosReales[ins.insumo_id]);
        return {
          insumo_id: ins.insumo_id,
          cantidad_real_utilizada: !isNaN(valReal) && valReal >= 0 ? valReal : 0,
        };
      });

      // Conservar la fecha y hora local exactamente como fue ingresada (sin correr horas por zona horaria UTC)
      const fechaElabFormat =
        fechaElaboracion.length === 16 ? `${fechaElaboracion}:00` : fechaElaboracion;

      const loteCreado = await lotesApi.createLote({
        producto_id: productoSeleccionado!.id,
        codigo_lote: codigoLote.trim(),
        fecha_elaboracion: fechaElabFormat,
        fecha_vencimiento: fechaVencimiento,
        cantidad_producida: cantNum,
        observaciones: observaciones.trim() || undefined,
        consumos: payloadConsumos,
      });

      setExitoMsg(`¡Lote ${loteCreado.codigo_lote} creado exitosamente!`);

      if (onSuccess) {
        setTimeout(() => onSuccess(), 800);
      }
    } catch (err: any) {
      setErrorEnvio(err.message || "Error al crear el lote de producción.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoProductos) {
    return <LoadingState message="Cargando catálogo de productos y recetas activas..." />;
  }

  return (
    <FormContainer modal>
      <FormHeader title="Nuevo Lote" icon={FiBox} />

      {errorCarga && (
        <Box mb={4}>
          <AlertMessage type="error" message={errorCarga} />
        </Box>
      )}

      {productos.length === 0 && !errorCarga ? (
        <AlertMessage
          type="info"
          message="No hay productos con receta técnica ACTIVA disponibles para producción. Un administrador debe activar al menos una receta técnica en el módulo de Recetas."
        />
      ) : (
        <form onSubmit={handleSubmitLote} noValidate>
          <VStack gap={4} align="stretch">
            {/* 1. Selector de Producto */}
            <SelectField
              label="Producto a Elaborar"
              placeholder="Seleccione un producto con receta activa..."
              value={productoId ? String(productoId) : ""}
              onChange={(e) => handleSeleccionarProducto(e.target.value)}
              options={productos.map((p) => ({
                label: p.nombre,
                value: String(p.id),
              }))}
              error={errores.producto}
            />

            {productoSeleccionado && (
              <>
                {/* Resumen de Receta Activa del Producto */}
                <Box
                  bg="green.50"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="green.200"
                  w="100%"
                >
                  <VStack align="stretch" gap={1.5}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={1}>
                      <HStack gap={1.5} minW="0" flex="1">
                        <Badge colorPalette="green" size="sm" flexShrink={0}>
                          Receta Activa
                        </Badge>
                        <Text fontSize="xs" fontWeight="bold" color="green.900" truncate>
                          [{productoSeleccionado.receta_codigo}] {productoSeleccionado.receta_nombre}
                        </Text>
                      </HStack>
                      <Badge colorPalette="teal" size="sm" variant="subtle" flexShrink={0}>
                        Rend.: {productoSeleccionado.rendimiento_estandar} {productoSeleccionado.unidad_medida_simbolo}
                      </Badge>
                    </Flex>
                    {productoSeleccionado.dias_vida_util != null && (
                      <Text fontSize="2xs" color="gray.600">
                        Vida útil estándar: {productoSeleccionado.dias_vida_util} días
                      </Text>
                    )}
                  </VStack>
                </Box>

                {/* 2. Código de Lote */}
                <Field.Root required>
                  <Field.Label fontSize="md" fontFamily="sans-serif">
                    Código de Lote
                  </Field.Label>
                  <HStack>
                    <Input
                      value={codigoLote}
                      onChange={(e) => setCodigoLote(e.target.value)}
                      placeholder="LOT-PREFIJO-YYYYMMDD-SEC"
                      fontSize="sm"
                      fontWeight="semibold"
                      bg="gray.50"
                    />
                    <IconButton
                      aria-label="Regenerar sugerencia de código"
                      variant="outline"
                      colorPalette="green"
                      onClick={() => generarSugerenciaCodigo(productoSeleccionado.id, fechaElaboracion)}
                      loading={generandoCodigo}
                    >
                      <FiRefreshCw />
                    </IconButton>
                  </HStack>
                  {errores.codigoLote ? (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errores.codigoLote}
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Autogenerado por regla LOT-{`{PREFIJO}`}-{`{YYYYMMDD}`}-{`{SEC}`}. Editable si se requiere código externo.
                    </Text>
                  )}
                </Field.Root>

                {/* 3. Fechas: Elaboración y Vencimiento */}
                <Flex gap={4} direction={{ base: "column", sm: "row" }}>
                  <Box flex={1}>
                    <TextField
                      label="Fecha y Hora Elaboración"
                      type="datetime-local"
                      value={fechaElaboracion}
                      max={`${hoyFechaStr}T23:59`}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFechaElaboracion(val);
                        if (productoSeleccionado) {
                          generarSugerenciaCodigo(productoSeleccionado.id, val);
                          if (productoSeleccionado.dias_vida_util) {
                            setFechaVencimiento(
                              calcularVencimientoLocal(val, productoSeleccionado.dias_vida_util)
                            );
                          }
                        }
                      }}
                      error={errores.fechaElaboracion}
                    />
                  </Box>

                  <Box flex={1}>
                    <TextField
                      label="Fecha de Vencimiento"
                      type="date"
                      value={fechaVencimiento}
                      min={fechaElaboracion ? fechaElaboracion.slice(0, 10) : undefined}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      error={errores.fechaVencimiento}
                    />
                    {productoSeleccionado.dias_vida_util && !errores.fechaVencimiento && (
                      <Text fontSize="xs" color="teal.600" mt={1}>
                        Calculado con vida útil de {productoSeleccionado.dias_vida_util} días. Editable.
                      </Text>
                    )}
                  </Box>
                </Flex>

                {/* 4. Cantidad Producida con unidad de medida */}
                <Field.Root required>
                  <Field.Label fontSize="md" fontFamily="sans-serif">
                    Cantidad Producida
                  </Field.Label>
                  <HStack>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={cantidadProducida}
                      onChange={(e) => handleCambioCantidadProducida(e.target.value)}
                      placeholder="Ej. 10.5"
                      fontSize="md"
                      fontWeight="bold"
                    />
                    <Badge colorPalette="green" fontSize="sm" px={3} py={2} borderRadius="md">
                      {productoSeleccionado.unidad_medida_simbolo}
                    </Badge>
                  </HStack>
                  {errores.cantidadProducida ? (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errores.cantidadProducida}
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Rendimiento estándar nominal: {productoSeleccionado.rendimiento_estandar} {productoSeleccionado.unidad_medida_simbolo}.
                      Los insumos teóricos se escalan proporcionalmente a esta cantidad.
                    </Text>
                  )}
                </Field.Root>

                <Separator my={2} borderColor="gray.200" />

                {/* 5. Insumos Teóricos vs Consumo Real (Mobile-First Touch Cards) */}
                <Box>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="bold" fontSize="sm" color="gray.700" textTransform="uppercase">
                      Insumos y Consumo Real Utilizado
                    </Text>
                    <Badge colorPalette="blue" variant="outline" fontSize="xs">
                      Factor de escala: {factorEscala.toFixed(2)}x
                    </Badge>
                  </Flex>

                  <Text fontSize="xs" color="gray.500" mb={3}>
                    Precargados con el estimado de la receta activa. Modifique los consumos que hayan variado en planta.
                  </Text>

                  <VStack gap={2.5} align="stretch">
                    {productoSeleccionado.insumos_teoricos.map((ins) => {
                      const teorica = Math.round(ins.cantidad_nominal_receta * factorEscala * 100) / 100;
                      const real = consumosReales[ins.insumo_id] ?? String(teorica);
                      return (
                        <ConsumoInsumoCard
                          key={ins.insumo_id}
                          insumo={ins}
                          cantidadTeorica={teorica}
                          cantidadReal={real}
                          onCambioCantidadReal={(v) => handleCambioConsumoReal(ins.insumo_id, v)}
                          disabled={guardando}
                        />
                      );
                    })}
                  </VStack>
                </Box>

                {/* 6. Observaciones */}
                <TextAreaField
                  label="Observaciones (opcional)"
                  placeholder="Novedades de elaboración, desvíos, condiciones ambientales..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                />
              </>
            )}

            {/* Acciones */}
            <FormActions>
              <SubmitButton
                text="Guardar"
                icon={FiSave}
                loading={guardando}
                type="submit"
                colorPalette="green"
                disabled={!productoSeleccionado}
              />
              {onCancelar && (
                <CancelButton
                  text="Cancelar"
                  icon={FiXCircle}
                  onClick={onCancelar}
                  colorPalette="red"
                  variant="outline"
                />
              )}
            </FormActions>

            {errorEnvio && <AlertMessage type="error" message={errorEnvio} />}
            {exitoMsg && <AlertMessage type="success" message={exitoMsg} />}
          </VStack>
        </form>
      )}
    </FormContainer>
  );
};
