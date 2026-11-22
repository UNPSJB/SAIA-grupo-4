import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { BASE_URL } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import {
  COLOR_ESTADO_LOTE,
  ETIQUETA_ESTADO_LOTE,
} from "../../insumo/estadoLote";
import type { EstadoLote } from "../../insumo/types";

interface LoteInsumoSugerencia {
  id: number;
  insumo_id: number;
  insumo_nombre?: string | null;
  codigo_lote: string;
  fecha_vencimiento: string;
  estado: EstadoLote;
}

interface FiltroLoteInsumoAutocompleteProps {
  value: string;
  onChange: (valor: string) => void;
  onSeleccionarYFiltrar: (codigoLote: string) => void;
  onEnterSinLista: () => void;
}

const formatearFechaSoloDia = (fechaIso: string) => {
  if (!fechaIso) return "—";
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fechaIso;
};

export const FiltroLoteInsumoAutocomplete = ({
  value,
  onChange,
  onSeleccionarYFiltrar,
  onEnterSinLista,
}: FiltroLoteInsumoAutocompleteProps) => {
  const [terminoDebounce, setTerminoDebounce] = useState(() => value.trim());
  const [resultados, setResultados] = useState<LoteInsumoSugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string | null>(
    () => value.trim() || null,
  );

  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const opcionesRef = useRef<Array<HTMLDivElement | null>>([]);
  const omitirSiguienteBusquedaRef = useRef(false);

  // Debounce del texto ingresado
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerminoDebounce(value.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  // Reset de selección interna si el campo se limpia externamente (ej. botón "Limpiar")
  useEffect(() => {
    if (!value.trim()) {
      setCodigoSeleccionado(null);
      setResultados([]);
      setMostrarLista(false);
      setIndiceActivo(-1);
    }
  }, [value]);

  // Cierre al hacer click fuera del componente
  useEffect(() => {
    const manejarClickAfuera = (e: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setMostrarLista(false);
      }
    };
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  // Mantener visible la opción resaltada con teclado
  useEffect(() => {
    if (indiceActivo >= 0) {
      opcionesRef.current[indiceActivo]?.scrollIntoView({ block: "nearest" });
    }
  }, [indiceActivo]);

  // Consulta de sugerencias al backend
  useEffect(() => {
    if (omitirSiguienteBusquedaRef.current) {
      omitirSiguienteBusquedaRef.current = false;
      return;
    }
    if (codigoSeleccionado && terminoDebounce === codigoSeleccionado) {
      return;
    }
    if (terminoDebounce.length < 1) {
      setResultados([]);
      setIndiceActivo(-1);
      return;
    }

    let activo = true;
    setBuscando(true);
    apiFetch(
      `${BASE_URL}/lotes-insumo/?busqueda=${encodeURIComponent(
        terminoDebounce,
      )}&orden=desc&limite=20`,
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((items: LoteInsumoSugerencia[]) => {
        if (!activo) return;
        const lista = Array.isArray(items) ? items : [];
        setResultados(lista);
        setIndiceActivo(lista.length > 0 ? 0 : -1);
        setMostrarLista(true);
      })
      .catch(() => {
        if (!activo) return;
        setResultados([]);
        setIndiceActivo(-1);
      })
      .finally(() => {
        if (activo) setBuscando(false);
      });

    return () => {
      activo = false;
    };
  }, [terminoDebounce, codigoSeleccionado]);

  const seleccionarLote = (item: LoteInsumoSugerencia) => {
    omitirSiguienteBusquedaRef.current = true;
    setCodigoSeleccionado(item.codigo_lote);
    setMostrarLista(false);
    setIndiceActivo(-1);
    onChange(item.codigo_lote);
    onSeleccionarYFiltrar(item.codigo_lote);
  };

  return (
    <Box
      position="relative"
      ref={contenedorRef}
      w={{ base: "100%", sm: "auto" }}
      minW={{ base: "100%", sm: "15rem" }}
    >
      <HStack gap={1.5}>
        <Box position="relative" flex="1">
          <Input
            aria-label="Buscar por lote de insumo"
            size="sm"
            bg="white"
            borderRadius="md"
            placeholder="Lote de insumo (código o insumo)..."
            value={value}
            onChange={(e) => {
              omitirSiguienteBusquedaRef.current = false;
              setCodigoSeleccionado(null);
              onChange(e.target.value);
              setMostrarLista(true);
            }}
            onFocus={() => {
              if (
                resultados.length > 0 &&
                (!codigoSeleccionado || value.trim() !== codigoSeleccionado)
              ) {
                setMostrarLista(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                if (resultados.length === 0) return;
                e.preventDefault();
                if (!mostrarLista) {
                  setMostrarLista(true);
                  setIndiceActivo(0);
                } else {
                  setIndiceActivo((prev) =>
                    prev < resultados.length - 1 ? prev + 1 : 0,
                  );
                }
              } else if (e.key === "ArrowUp") {
                if (!mostrarLista || resultados.length === 0) return;
                e.preventDefault();
                setIndiceActivo((prev) =>
                  prev > 0 ? prev - 1 : resultados.length - 1,
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (
                  mostrarLista &&
                  !buscando &&
                  value.trim() === terminoDebounce &&
                  indiceActivo >= 0 &&
                  resultados[indiceActivo]
                ) {
                  seleccionarLote(resultados[indiceActivo]);
                } else {
                  setMostrarLista(false);
                  onEnterSinLista();
                }
              } else if (e.key === "Escape") {
                if (mostrarLista) {
                  e.preventDefault();
                  setMostrarLista(false);
                }
              }
            }}
          />
        </Box>
        {buscando && <Spinner size="xs" color="green.600" flexShrink={0} />}
      </HStack>

      {mostrarLista && resultados.length > 0 && (
        <Box
          position="absolute"
          zIndex={30}
          left={0}
          w={{ base: "100%", sm: "320px" }}
          mt={1}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="md"
          maxH="240px"
          overflowY="auto"
        >
          <VStack align="stretch" gap={0}>
            {resultados.map((item, idx) => (
              <Box
                key={item.id}
                ref={(el: HTMLDivElement | null) => {
                  opcionesRef.current[idx] = el;
                }}
                px={3}
                py={2}
                cursor="pointer"
                bg={idx === indiceActivo ? "green.100" : undefined}
                _hover={{ bg: "green.50" }}
                borderBottomWidth="1px"
                borderColor="gray.100"
                onMouseEnter={() => setIndiceActivo(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionarLote(item)}
              >
                <Flex justify="space-between" align="center" gap={2}>
                  <Box textAlign="left" minW={0}>
                    <Text fontSize="sm" fontWeight="semibold" truncate>
                      {item.codigo_lote}
                      {item.insumo_nombre ? ` · ${item.insumo_nombre}` : ""}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Vence: {formatearFechaSoloDia(item.fecha_vencimiento)}
                    </Text>
                  </Box>
                  <Badge
                    colorPalette={COLOR_ESTADO_LOTE[item.estado]}
                    flexShrink={0}
                    size="sm"
                  >
                    {ETIQUETA_ESTADO_LOTE[item.estado]}
                  </Badge>
                </Flex>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {mostrarLista &&
        !buscando &&
        terminoDebounce.length >= 1 &&
        resultados.length === 0 && (
          <Box
            position="absolute"
            zIndex={30}
            left={0}
            w={{ base: "100%", sm: "320px" }}
            mt={1}
            px={3}
            py={2}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            boxShadow="md"
          >
            <Text fontSize="xs" color="gray.500">
              <FiSearch style={{ display: "inline", marginRight: 4 }} />
              No se encontraron lotes de insumo con "{terminoDebounce}".
            </Text>
          </Box>
        )}
    </Box>
  );
};
