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
  FiAlertTriangle,
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
import {
  ConsumoInsumoCard,
  type AsignacionLoteForm,
} from "./components/ConsumoInsumoCard";
import {
  convertirEntreUnidades,
  obtenerInfoUnidadInsumo,
} from "../recetas/utils/unidadesPaso";
import type { InsumoTeoricoReceta, ProductoDisponibleLote } from "./types";

const EPS = 0.0001;
const UMBRAL_DESVIO_EXTREMO_PCT = 20;

const redondear3 = (n: number) => Math.round(n * 1000) / 1000;
const formatearCantidad = (n: number) => {
  const r = redondear3(n);
  return Number.isInteger(r) ? String(r) : String(r);
};

const sugerirAsignacionesFEFO = (
  insumo: InsumoTeoricoReceta,
  cantidadObjetivo: number,
): AsignacionLoteForm[] => {
  if (isNaN(cantidadObjetivo) || cantidadObjetivo <= 0) return [];
  const lotes = insumo.lotes_disponibles ?? [];
  if (lotes.length === 0) return [];

  const infoUnidad = obtenerInfoUnidadInsumo({
    simbolo: insumo.unidad_medida_simbolo,
    tipo_magnitud: insumo.unidad_medida_tipo ?? undefined,
  });
  const resultado: AsignacionLoteForm[] = [];
  let restante = redondear3(cantidadObjetivo);

  for (const lote of lotes) {
    if (restante <= EPS) break;
    const disponible = Number(lote.cantidad_actual);
    if (disponible <= EPS) continue;
    const tomar = redondear3(Math.min(restante, disponible));
    resultado.push({
      lote_insumo_id: String(lote.id),
      cantidad: String(tomar),
      unidad: infoUnidad.unidadDefault,
    });
    restante = redondear3(restante - tomar);
  }

  return resultado;
};

const sugerirCantidadProducida = (
  prod: ProductoDisponibleLote,
  masaG: number,
): string => {
  if (isNaN(masaG) || masaG <= 0) return "";
  const infoProd = obtenerInfoUnidadInsumo({
    simbolo: prod.unidad_medida_simbolo,
    tipo_magnitud: prod.unidad_medida_tipo ?? undefined,
  });
  if (infoProd.tipoMagnitud === "masa") {
    const conv = convertirEntreUnidades(masaG, "g", prod.unidad_medida_simbolo);
    return String(Math.round(conv * 1000) / 1000);
  }
  const porcion = prod.tamano_porcion != null ? Number(prod.tamano_porcion) : 0;
  if (porcion > 0) {
    return String(Math.floor(masaG / porcion));
  }
  return "";
};

interface RegistrarLoteFormProps {
  productoIdInicial?: number;
  masaTandaInicial?: number;
  onSuccess?: () => void;
  onCancelar?: () => void;
}

export const RegistrarLoteForm = ({
  productoIdInicial,
  masaTandaInicial,
  onSuccess,
  onCancelar,
}: RegistrarLoteFormProps) => {
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

  // Base de tanda / masa elaborada (en gramos de receta)
  const [masaTandaG, setMasaTandaG] = useState<string>("");
  // Cantidad comercial final producida (en unidad del producto)
  const [cantidadProducida, setCantidadProducida] = useState<string>("");
  const [cantidadProducidaEditadaManual, setCantidadProducidaEditadaManual] = useState(false);

  // Consumos reales ingresados por el operador (indexados por insumo_id)
  const [consumosReales, setConsumosReales] = useState<Record<number, string>>({});
  // Unidad elegida por el operador para el consumo real de cada insumo
  const [unidadesReales, setUnidadesReales] = useState<Record<number, string>>({});
  // Asignaciones multi-lote por insumo (indexadas por insumo_id)
  const [asignacionesLotes, setAsignacionesLotes] = useState<
    Record<number, AsignacionLoteForm[]>
  >({});

  const [observaciones, setObservaciones] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exitoMsg, setExitoMsg] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

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

  // Inicializa producto, cantidad (estándar o escalada), vencimiento, código, consumos y sugerencias FEFO
  const inicializarProducto = useCallback(
    (prod: ProductoDisponibleLote, cantidadBase?: number) => {
      setProductoId(prod.id);
      setErrorEnvio("");
      setExitoMsg("");

      const rendimiento = Number(prod.rendimiento_estandar) || 1;
      const masaUsada =
        cantidadBase != null && cantidadBase > 0 ? cantidadBase : rendimiento;
      const factor = masaUsada / rendimiento;

      setMasaTandaG(String(masaUsada));
      setCantidadProducida(sugerirCantidadProducida(prod, masaUsada));
      setCantidadProducidaEditadaManual(false);

      if (prod.dias_vida_util) {
        setFechaVencimiento(calcularVencimientoLocal(fechaElaboracion, prod.dias_vida_util));
      } else {
        setFechaVencimiento("");
      }

      generarSugerenciaCodigo(prod.id, fechaElaboracion);

      const iniciales: Record<number, string> = {};
      const unidadesIniciales: Record<number, string> = {};
      const asignacionesIniciales: Record<number, AsignacionLoteForm[]> = {};
      prod.insumos_teoricos.forEach((ins) => {
        const teorica =
          Math.round(Number(ins.cantidad_nominal_receta) * factor * 100) / 100;
        const info = obtenerInfoUnidadInsumo({
          simbolo: ins.unidad_medida_simbolo,
          tipo_magnitud: ins.unidad_medida_tipo ?? undefined,
        });
        iniciales[ins.insumo_id] = String(teorica);
        unidadesIniciales[ins.insumo_id] = info.unidadDefault;
        asignacionesIniciales[ins.insumo_id] = sugerirAsignacionesFEFO(ins, teorica);
      });
      setConsumosReales(iniciales);
      setUnidadesReales(unidadesIniciales);
      setAsignacionesLotes(asignacionesIniciales);
    },
    [fechaElaboracion, generarSugerenciaCodigo],
  );

  // Carga inicial de productos con receta activa (y precarga si viene desde ficha técnica)
  useEffect(() => {
    const cargar = async () => {
      setCargandoProductos(true);
      setErrorCarga("");
      try {
        const datos = await lotesApi.getProductosDisponibles();
        setProductos(datos);
        if (productoIdInicial != null) {
          const prodInicial = datos.find((p) => p.id === productoIdInicial);
          if (prodInicial) {
            inicializarProducto(prodInicial, masaTandaInicial);
          }
        }
      } catch (err: any) {
        setErrorCarga(err.message || "Error al cargar productos con receta activa.");
      } finally {
        setCargandoProductos(false);
      }
    };
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === productoId) || null;
  }, [productos, productoId]);

  const handleSeleccionarProducto = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      setProductoId(null);
      setCodigoLote("");
      setFechaVencimiento("");
      setMasaTandaG("");
      setCantidadProducida("");
      setCantidadProducidaEditadaManual(false);
      setConsumosReales({});
      setAsignacionesLotes({});
      return;
    }

    const prod = productos.find((p) => p.id === id);
    if (!prod) return;

    inicializarProducto(prod);
  };

  // Factor de escala proporcional: masa_tanda_g / rendimiento_estandar
  const factorEscala = useMemo(() => {
    if (!productoSeleccionado) return 1.0;
    const masaNum = parseFloat(masaTandaG);
    const rendNum = Number(productoSeleccionado.rendimiento_estandar);
    if (isNaN(masaNum) || masaNum <= 0 || isNaN(rendNum) || rendNum <= 0) {
      return 1.0;
    }
    return masaNum / rendNum;
  }, [masaTandaG, productoSeleccionado]);

  // Comparación no bloqueante entre cantidad producida final y teórico derivado de la masa
  const desvioCantidadProducida = useMemo(() => {
    if (!productoSeleccionado) return null;
    const masaNum = parseFloat(masaTandaG);
    if (isNaN(masaNum) || masaNum <= 0) return null;
    const teoricoStr = sugerirCantidadProducida(productoSeleccionado, masaNum);
    if (!teoricoStr) return null;
    const teorico = parseFloat(teoricoStr);
    if (isNaN(teorico) || teorico <= 0) return null;

    const real = parseFloat(cantidadProducida);
    if (isNaN(real) || real <= 0) return null;

    const diff = redondear3(teorico - real);
    if (Math.abs(diff) <= EPS) return null;

    const porcentaje = (Math.abs(diff) / teorico) * 100;
    const superaTeorico = real > teorico + EPS;
    const desvioExtremo = !superaTeorico && porcentaje > UMBRAL_DESVIO_EXTREMO_PCT;

    return {
      teorico,
      real,
      merma: diff > 0 ? diff : 0,
      exceso: diff < 0 ? Math.abs(diff) : 0,
      porcentaje,
      superaTeorico,
      desvioExtremo,
    };
  }, [productoSeleccionado, masaTandaG, cantidadProducida]);

  // Cuando cambia la masa base de tanda (en g), recalcular todos los consumos reales y lotes FEFO
  const handleCambioMasaTanda = (valor: string) => {
    setMasaTandaG(valor);
    if (!productoSeleccionado) return;

    const masaNum = parseFloat(valor);
    const rendNum = Number(productoSeleccionado.rendimiento_estandar);
    const factor = !isNaN(masaNum) && masaNum > 0 && !isNaN(rendNum) && rendNum > 0
      ? masaNum / rendNum
      : 1.0;

    if (!cantidadProducidaEditadaManual && !isNaN(masaNum) && masaNum > 0) {
      setCantidadProducida(sugerirCantidadProducida(productoSeleccionado, masaNum));
    }

    const nuevosConsumos: Record<number, string> = {};
    const nuevasAsignaciones: Record<number, AsignacionLoteForm[]> = {};

    productoSeleccionado.insumos_teoricos.forEach((ins) => {
      const teorica = Math.round(ins.cantidad_nominal_receta * factor * 100) / 100;
      const info = obtenerInfoUnidadInsumo({
        simbolo: ins.unidad_medida_simbolo,
        tipo_magnitud: ins.unidad_medida_tipo ?? undefined,
      });
      const unidadBase = info.simboloBase || ins.unidad_medida_simbolo;
      const unidadElegida = unidadesReales[ins.insumo_id] || info.unidadDefault;
      const teoricaEnUnidad = convertirEntreUnidades(teorica, unidadBase, unidadElegida);

      nuevosConsumos[ins.insumo_id] = String(teoricaEnUnidad);
      nuevasAsignaciones[ins.insumo_id] = sugerirAsignacionesFEFO(ins, teorica);
    });

    setConsumosReales(nuevosConsumos);
    setAsignacionesLotes(nuevasAsignaciones);
  };

  // Cambiar cantidad producida comercial NO altera masa base ni insumos teóricos (refleja mermas)
  const handleCambioCantidadProducida = (valor: string) => {
    setCantidadProducida(valor);
    setCantidadProducidaEditadaManual(true);
  };

  // Cuando el operador edita la cantidad real de un insumo
  const handleCambioConsumoReal = (insumoId: number, valor: string) => {
    setConsumosReales((prev) => ({ ...prev, [insumoId]: valor }));

    const num = parseFloat(valor);
    if (valor.trim() === "" || isNaN(num) || num <= 0) {
      setAsignacionesLotes((prev) => ({ ...prev, [insumoId]: [] }));
    } else {
      const insumo = productoSeleccionado?.insumos_teoricos.find(
        (i) => i.insumo_id === insumoId,
      );
      if (insumo) {
        const info = obtenerInfoUnidadInsumo({
          simbolo: insumo.unidad_medida_simbolo,
          tipo_magnitud: insumo.unidad_medida_tipo ?? undefined,
        });
        const unidadReal = unidadesReales[insumoId] || info.unidadDefault;
        const numEnBase = convertirEntreUnidades(
          num,
          unidadReal,
          info.simboloBase || insumo.unidad_medida_simbolo,
        );
        setAsignacionesLotes((prev) => ({
          ...prev,
          [insumoId]: sugerirAsignacionesFEFO(insumo, numEnBase),
        }));
      }
    }
  };

  const handleCambioUnidadReal = (insumoId: number, nuevaUnidad: string) => {
    const insumo = productoSeleccionado?.insumos_teoricos.find(
      (i) => i.insumo_id === insumoId,
    );
    const info = insumo
      ? obtenerInfoUnidadInsumo({
          simbolo: insumo.unidad_medida_simbolo,
          tipo_magnitud: insumo.unidad_medida_tipo ?? undefined,
        })
      : null;
    const unidadAnterior = unidadesReales[insumoId] || info?.unidadDefault || nuevaUnidad;

    setUnidadesReales((prev) => ({ ...prev, [insumoId]: nuevaUnidad }));

    if (unidadAnterior !== nuevaUnidad) {
      const actualStr = (consumosReales[insumoId] ?? "").trim();
      const actualNum = parseFloat(actualStr);
      if (actualStr !== "" && !isNaN(actualNum) && actualNum >= 0) {
        const convertido = convertirEntreUnidades(actualNum, unidadAnterior, nuevaUnidad);
        setConsumosReales((prev) => ({
          ...prev,
          [insumoId]: String(convertido),
        }));
      }
    }
  };

  const handleCambioAsignaciones = (insumoId: number, nuevas: AsignacionLoteForm[]) => {
    setAsignacionesLotes((prev) => ({ ...prev, [insumoId]: nuevas }));
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
    const masaNum = parseFloat(masaTandaG);
    if (isNaN(masaNum) || masaNum <= 0) {
      errs.masaTandaG = "Debe ingresar una masa base de tanda mayor a cero.";
    }
    const cantNum = parseFloat(cantidadProducida);
    if (isNaN(cantNum) || cantNum <= 0) {
      errs.cantidadProducida = "Debe ingresar la cantidad producida final mayor a cero.";
    }

    let errorConsumoDetalle = "";
    if (productoSeleccionado) {
      for (const ins of productoSeleccionado.insumos_teoricos) {
        const info = obtenerInfoUnidadInsumo({
          simbolo: ins.unidad_medida_simbolo,
          tipo_magnitud: ins.unidad_medida_tipo ?? undefined,
        });
        const unidadBase = info.simboloBase || ins.unidad_medida_simbolo;
        const unidadReal =
          info.opcionesUnidad.length > 0
            ? unidadesReales[ins.insumo_id] || info.unidadDefault
            : unidadBase;

        const valRealStr = consumosReales[ins.insumo_id] ?? "";
        const valReal = parseFloat(valRealStr);
        if (valRealStr === "" || isNaN(valReal) || valReal < 0) {
          errorConsumoDetalle = `Debe ingresar una cantidad real válida (>= 0) para ${ins.nombre}.`;
          break;
        }
        if (valReal === 0) continue;

        const valRealBase = convertirEntreUnidades(valReal, unidadReal, unidadBase);

        const asigs = asignacionesLotes[ins.insumo_id] ?? [];
        if (asigs.length === 0) {
          errorConsumoDetalle = `Debe asignar al menos un lote físico de ${ins.nombre} para cubrir ${redondear3(valRealBase)} ${unidadBase}.`;
          break;
        }

        const lotesUsados = new Set<string>();
        let sumaBase = 0;
        for (const asig of asigs) {
          if (!asig.lote_insumo_id) {
            errorConsumoDetalle = `Seleccione un lote físico en todas las filas de ${ins.nombre}.`;
            break;
          }
          if (lotesUsados.has(asig.lote_insumo_id)) {
            errorConsumoDetalle = `No puede repetir el mismo lote físico dentro de ${ins.nombre}.`;
            break;
          }
          lotesUsados.add(asig.lote_insumo_id);

          const cantAsig = parseFloat(asig.cantidad);
          if (isNaN(cantAsig) || cantAsig <= 0) {
            errorConsumoDetalle = `Cada lote asignado en ${ins.nombre} debe tener una cantidad mayor a cero.`;
            break;
          }
          const loteDisp = (ins.lotes_disponibles ?? []).find(
            (l) => String(l.id) === asig.lote_insumo_id,
          );
          if (!loteDisp) {
            errorConsumoDetalle = `Uno de los lotes seleccionados en ${ins.nombre} ya no está disponible.`;
            break;
          }
          const unidadFila =
            info.opcionesUnidad.length > 0
              ? asig.unidad || info.unidadDefault
              : unidadBase;
          const cantAsigBase = convertirEntreUnidades(cantAsig, unidadFila, unidadBase);
          if (cantAsigBase > Number(loteDisp.cantidad_actual) + EPS) {
            errorConsumoDetalle = `La cantidad asignada al lote ${loteDisp.codigo_lote} de ${ins.nombre} supera su stock disponible.`;
            break;
          }
          sumaBase += cantAsigBase;
        }
        if (errorConsumoDetalle) break;

        if (Math.abs(sumaBase - valRealBase) > EPS) {
          errorConsumoDetalle = `En ${ins.nombre}, la suma de lotes (${redondear3(sumaBase)} ${unidadBase}) debe coincidir exactamente con el consumo real declarado (${redondear3(valRealBase)} ${unidadBase}).`;
          break;
        }
      }
    }

    if (Object.keys(errs).length > 0 || errorConsumoDetalle) {
      setErrores(errs);
      setErrorEnvio(
        errorConsumoDetalle || "Por favor, revise los campos marcados antes de guardar.",
      );
      return;
    }

    setErrores({});
    setGuardando(true);

    try {
      const payloadConsumos = (productoSeleccionado?.insumos_teoricos ?? []).map((ins) => {
        const info = obtenerInfoUnidadInsumo({
          simbolo: ins.unidad_medida_simbolo,
          tipo_magnitud: ins.unidad_medida_tipo ?? undefined,
        });
        const unidadBase = info.simboloBase || ins.unidad_medida_simbolo;
        const unidadReal =
          info.opcionesUnidad.length > 0
            ? unidadesReales[ins.insumo_id] || info.unidadDefault
            : unidadBase;
        const valReal = parseFloat(consumosReales[ins.insumo_id]);
        const cantReal = !isNaN(valReal) && valReal >= 0 ? valReal : 0;
        const asigs = cantReal === 0 ? [] : (asignacionesLotes[ins.insumo_id] ?? []);
        return {
          insumo_id: ins.insumo_id,
          cantidad_real_utilizada: cantReal,
          unidad: unidadReal,
          lotes: asigs
            .filter((a) => a.lote_insumo_id && parseFloat(a.cantidad) > 0)
            .map((a) => ({
              lote_insumo_id: parseInt(a.lote_insumo_id, 10),
              cantidad: parseFloat(a.cantidad),
              unidad:
                info.opcionesUnidad.length > 0
                  ? a.unidad || info.unidadDefault
                  : unidadBase,
            })),
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
        masa_tanda_g: masaNum,
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
                        <Badge colorPalette="gray" variant="surface" size="sm" flexShrink={0}>
                          v{productoSeleccionado.receta_version ?? 1}
                        </Badge>
                      </HStack>
                      <Badge colorPalette="teal" size="sm" variant="subtle" flexShrink={0}>
                        Rend.: {productoSeleccionado.rendimiento_estandar} g
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

                {/* 4. Desacople: Base de tanda (g) + Cantidad Producida Final (unidad del producto) */}
                <Flex gap={4} direction={{ base: "column", sm: "row" }}>
                  <Box flex={1}>
                    <Field.Root required>
                      <Field.Label fontSize="md" fontFamily="sans-serif">
                        Base de tanda (Masa elaborada)
                      </Field.Label>
                      <HStack>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          value={masaTandaG}
                          onChange={(e) => handleCambioMasaTanda(e.target.value)}
                          placeholder={String(productoSeleccionado.rendimiento_estandar)}
                          fontSize="md"
                          fontWeight="bold"
                        />
                        <Badge colorPalette="teal" fontSize="sm" px={3} py={2} borderRadius="md">
                          g
                        </Badge>
                      </HStack>
                      {errores.masaTandaG ? (
                        <Text color="red.500" fontSize="sm" mt={1}>
                          {errores.masaTandaG}
                        </Text>
                      ) : (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Rendimiento estándar de la receta: {productoSeleccionado.rendimiento_estandar} g. Escala los insumos teóricos.
                        </Text>
                      )}
                    </Field.Root>
                  </Box>

                  <Box flex={1}>
                    <Field.Root required>
                      <Field.Label fontSize="md" fontFamily="sans-serif">
                        Cantidad producida final
                      </Field.Label>
                      <HStack>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          value={cantidadProducida}
                          onChange={(e) => handleCambioCantidadProducida(e.target.value)}
                          placeholder={`Ej. 40`}
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
                      ) : desvioCantidadProducida ? (
                        <VStack align="stretch" gap={1.5} mt={1}>
                          {!desvioCantidadProducida.superaTeorico && (
                            <Text fontSize="xs" color="gray.500">
                              (Teórico: {formatearCantidad(desvioCantidadProducida.teorico)}{" "}
                              {productoSeleccionado.unidad_medida_simbolo} — Merma:{" "}
                              {formatearCantidad(desvioCantidadProducida.merma)}{" "}
                              {productoSeleccionado.unidad_medida_simbolo} /{" "}
                              {desvioCantidadProducida.porcentaje.toFixed(1)}%)
                            </Text>
                          )}

                          {(desvioCantidadProducida.superaTeorico ||
                            desvioCantidadProducida.desvioExtremo) && (
                            <HStack
                              align="flex-start"
                              gap={2}
                              bg="yellow.50"
                              borderWidth="1px"
                              borderColor="yellow.300"
                              borderLeftWidth="4px"
                              borderLeftColor="yellow.500"
                              borderRadius="md"
                              px={2.5}
                              py={1.5}
                              color="yellow.900"
                            >
                              <Box mt="2px" flexShrink={0} color="yellow.700">
                                <FiAlertTriangle size={14} />
                              </Box>
                              <Text fontSize="xs" lineHeight="short">
                                {desvioCantidadProducida.superaTeorico
                                  ? `El valor supera el teórico (${formatearCantidad(
                                      desvioCantidadProducida.teorico,
                                    )} ${productoSeleccionado.unidad_medida_simbolo}, +${formatearCantidad(
                                      desvioCantidadProducida.exceso,
                                    )} ${productoSeleccionado.unidad_medida_simbolo} / +${desvioCantidadProducida.porcentaje.toFixed(
                                      1,
                                    )}%). Verificá que no sea un error de carga.`
                                  : `Desvío alto: merma del ${desvioCantidadProducida.porcentaje.toFixed(
                                      1,
                                    )}% respecto al teórico (${formatearCantidad(
                                      desvioCantidadProducida.teorico,
                                    )} ${productoSeleccionado.unidad_medida_simbolo}). Verificá si falta o sobra un dígito.`}
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      ) : (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {productoSeleccionado.tamano_porcion != null &&
                          Number(productoSeleccionado.tamano_porcion) > 0 &&
                          productoSeleccionado.unidad_medida_tipo?.toLowerCase() !== "masa"
                            ? `Sugerido con porción de ${productoSeleccionado.tamano_porcion} g. Editable por mermas.`
                            : "Cantidad comercial terminada que ingresa al lote (editable por mermas)."}
                        </Text>
                      )}
                    </Field.Root>
                  </Box>
                </Flex>

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
                      const infoU = obtenerInfoUnidadInsumo({
                        simbolo: ins.unidad_medida_simbolo,
                        tipo_magnitud: ins.unidad_medida_tipo ?? undefined,
                      });
                      const unidadReal = unidadesReales[ins.insumo_id] ?? infoU.unidadDefault;
                      const asignaciones = asignacionesLotes[ins.insumo_id] ?? [];
                      return (
                        <ConsumoInsumoCard
                          key={ins.insumo_id}
                          insumo={ins}
                          cantidadTeorica={teorica}
                          cantidadReal={real}
                          unidadReal={unidadReal}
                          asignaciones={asignaciones}
                          onCambioCantidadReal={(v) => handleCambioConsumoReal(ins.insumo_id, v)}
                          onCambioUnidadReal={(u) => handleCambioUnidadReal(ins.insumo_id, u)}
                          onCambioAsignaciones={(nuevas) =>
                            handleCambioAsignaciones(ins.insumo_id, nuevas)
                          }
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
