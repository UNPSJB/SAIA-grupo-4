import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  HStack,
  Input,
  Text,
} from "@chakra-ui/react";
import { FiClock } from "react-icons/fi";
import {
  AlertMessage,
  FiltroSelect,
  FiltroTexto,
  FiltrosBar,
  LoadingState,
  TablePagination,
} from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { BASE_URL, ITEMS_POR_PAGINA } from "../config";
import { apiFetch } from "../features/auth/apiFetch";
import { lotesApi } from "../features/lotes/hooks/lotesApi";
import { ListadoLotes } from "../features/lotes/ListadoLotes";
import { LoteDetalle } from "../features/lotes/LoteDetalle";
import type { Lote } from "../features/lotes/types";
import type { Producto } from "../features/productos/types";

export default function HistorialLotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productos, setProductos] = useState<Array<{ id: number; nombre: string }>>([]);

  // Filtros borradores
  const [busqueda, setBusqueda] = useState("");
  const [productoIdFiltro, setProductoIdFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");

  // Filtros aplicados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busqueda: "",
    producto_id: "",
    desde: "",
    hasta: "",
  });

  const [page, setPage] = useState(1);
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);

  // Carga de catálogo completo de productos (incluyendo dados de baja o sin receta activa actual) para auditoría
  useEffect(() => {
    apiFetch(`${BASE_URL}/productos/`)
      .then((res) => (res.ok ? (res.json() as Promise<Producto[]>) : Promise.reject()))
      .then((data) => setProductos(data.map((p) => ({ id: p.id, nombre: p.nombre }))))
      .catch(() => {
        lotesApi.getProductosDisponibles().then(setProductos).catch(() => {});
      });
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await lotesApi.getHistorialGeneral({
        busqueda: filtrosAplicados.busqueda || undefined,
        producto_id: filtrosAplicados.producto_id ? Number(filtrosAplicados.producto_id) : undefined,
        desde: filtrosAplicados.desde || undefined,
        hasta: filtrosAplicados.hasta || undefined,
      });
      setLotes(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar el historial de lotes.");
    } finally {
      setLoading(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const aplicarFiltros = () => {
    setFiltrosAplicados({
      busqueda: busqueda.trim(),
      producto_id: productoIdFiltro,
      desde: desdeFiltro,
      hasta: hastaFiltro,
    });
    setPage(1);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setProductoIdFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setFiltrosAplicados({
      busqueda: "",
      producto_id: "",
      desde: "",
      hasta: "",
    });
    setPage(1);
  };

  const hayFiltrosActivos = useMemo(() => {
    return (
      filtrosAplicados.busqueda !== "" ||
      filtrosAplicados.producto_id !== "" ||
      filtrosAplicados.desde !== "" ||
      filtrosAplicados.hasta !== ""
    );
  }, [filtrosAplicados]);

  const totalPaginas = Math.max(1, Math.ceil(lotes.length / ITEMS_POR_PAGINA));
  const paginaActual = Math.min(page, totalPaginas);

  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return lotes.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [lotes, paginaActual]);

  return (
    <ListadoContainer maxW="8xl">
      <ListadoHeader title="Historial de Lotes" icon={FiClock} />

      <Box
        mb={6}
        w="100%"
        css={{
          "& > div": {
            width: "100% !important",
            marginLeft: "0 !important",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
          },
          "& input": {
            width: { base: "100%", sm: "auto" },
            minWidth: { base: "100%", sm: "14rem" },
          },
          "& [data-scope='select']": {
            width: { base: "100%", sm: "auto" },
            minWidth: { base: "100%", sm: "14rem" },
          },
        }}
      >
        <FiltrosBar
          onAplicar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
          hayFiltrosActivos={hayFiltrosActivos}
        >
          <FiltroTexto
            ariaLabel="Buscar por código, producto o receta"
            placeholder="Buscar por código, producto o receta..."
            value={busqueda}
            onChange={setBusqueda}
          />
          <FiltroSelect
            ariaLabel="Filtrar por producto"
            placeholder="Todos los productos"
            value={productoIdFiltro}
            onChange={setProductoIdFiltro}
            options={productos.map((p) => ({
              label: p.nombre,
              value: String(p.id),
            }))}
          />
          <HStack gap={2} align="center">
            <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
              Desde:
            </Text>
            <Input
              type="date"
              size="sm"
              value={desdeFiltro}
              max={hastaFiltro || undefined}
              onChange={(e) => setDesdeFiltro(e.target.value)}
              borderRadius="md"
              bg="white"
            />
            <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
              Hasta:
            </Text>
            <Input
              type="date"
              size="sm"
              value={hastaFiltro}
              min={desdeFiltro || undefined}
              onChange={(e) => setHastaFiltro(e.target.value)}
              borderRadius="md"
              bg="white"
            />
          </HStack>
        </FiltrosBar>
      </Box>

      {loading ? (
        <LoadingState message="Cargando historial de producción..." />
      ) : error ? (
        <AlertMessage type="error" message={error} />
      ) : lotes.length === 0 ? (
        <AlertMessage
          type="info"
          message={
            hayFiltrosActivos
              ? "No se encontraron lotes que coincidan con los filtros aplicados."
              : "No hay lotes de producción registrados en el sistema."
          }
        />
      ) : (
        <>
          <ListadoLotes
            lotes={itemsPaginados}
            onVer={setLoteSeleccionado}
            mostrarOperador={true}
            hayFiltrosActivos={hayFiltrosActivos}
          />
          <Box mt={4}>
            <TablePagination
              count={lotes.length}
              page={paginaActual}
              pageSize={ITEMS_POR_PAGINA}
              onPageChange={setPage}
              labelSingular="lote"
              labelPlural="lotes"
            />
          </Box>
        </>
      )}

      {loteSeleccionado && (
        <LoteDetalle
          lote={loteSeleccionado}
          onCerrar={() => setLoteSeleccionado(null)}
        />
      )}
    </ListadoContainer>
  );
}
