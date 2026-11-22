import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
} from "@chakra-ui/react";
import { FiArrowLeft, FiClock } from "react-icons/fi";
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
import { armarFiltros } from "../utils/exportacion";
import { formatearFecha } from "../utils/fecha";
import { LoteDetalle } from "../features/lotes/LoteDetalle";
import type { Lote } from "../features/lotes/types";
import type { Producto } from "../features/productos/types";

export default function HistorialLotesPage() {
  // Si se llega desde "Ver producciones" de un lote de insumo, el código viene
  // en la URL y arranca como filtro ya aplicado.
  const [searchParams, setSearchParams] = useSearchParams();
  const loteInsumoInicial = searchParams.get("codigo_lote_insumo")?.trim() ?? "";

  // Destino de vuelta: solo existe si se llegó desde otra pantalla (por ejemplo
  // los lotes de un insumo). Con una URL escrita a mano no hay botón.
  const navigate = useNavigate();
  const location = useLocation();
  const origen = location.state as { volverA?: string; volverEtiqueta?: string } | null;

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productos, setProductos] = useState<Array<{ id: number; nombre: string }>>([]);

  // Filtros borradores
  const [busqueda, setBusqueda] = useState("");
  const [productoIdFiltro, setProductoIdFiltro] = useState("");
  const [loteInsumoFiltro, setLoteInsumoFiltro] = useState(loteInsumoInicial);
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");

  // Filtros aplicados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busqueda: "",
    producto_id: "",
    lote_insumo: loteInsumoInicial,
    desde: "",
    hasta: "",
  });

  const [page, setPage] = useState(1);
  const [loteSeleccionado, setLoteSeleccionado] = useState<Lote | null>(null);

  const hoy = useMemo(() => {
    const d = new Date();
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  }, []);

  const handleCambiarDesde = (valor: string) => {
    if (valor > hoy) {
      valor = hoy;
    }
    setDesdeFiltro(valor);
    if (hastaFiltro && valor > hastaFiltro) {
      setHastaFiltro(valor);
    }
  };

  const handleCambiarHasta = (valor: string) => {
    if (valor > hoy) {
      valor = hoy;
    }
    if (desdeFiltro && valor < desdeFiltro) {
      valor = desdeFiltro;
    }
    setHastaFiltro(valor);
  };

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
        codigo_lote_insumo: filtrosAplicados.lote_insumo || undefined,
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

  const aplicarFiltros = (busquedaManual?: string) => {
    const texto = typeof busquedaManual === "string" ? busquedaManual : busqueda;
    let desde = desdeFiltro;
    let hasta = hastaFiltro;

    if (desde && desde > hoy) {
      desde = hoy;
      setDesdeFiltro(hoy);
    }
    if (hasta && hasta > hoy) {
      hasta = hoy;
      setHastaFiltro(hoy);
    }
    if (desde && hasta && desde > hasta) {
      hasta = desde;
      setHastaFiltro(desde);
    }

    const loteInsumo = loteInsumoFiltro.trim();

    setFiltrosAplicados({
      busqueda: texto.trim(),
      producto_id: productoIdFiltro,
      lote_insumo: loteInsumo,
      desde,
      hasta,
    });
    // La URL refleja el filtro por lote de insumo, así un refresh no lo pisa.
    setSearchParams(loteInsumo ? { codigo_lote_insumo: loteInsumo } : {}, {
      replace: true,
      state: location.state,
    });
    setPage(1);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setProductoIdFiltro("");
    setLoteInsumoFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setFiltrosAplicados({
      busqueda: "",
      producto_id: "",
      lote_insumo: "",
      desde: "",
      hasta: "",
    });
    setSearchParams({}, { replace: true, state: location.state });
    setPage(1);
  };

  const hayFiltrosActivos = useMemo(() => {
    return (
      filtrosAplicados.busqueda !== "" ||
      filtrosAplicados.producto_id !== "" ||
      filtrosAplicados.lote_insumo !== "" ||
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
    <ListadoContainer>
      <ListadoHeader title="Historial de Lotes" icon={FiClock} />

      {origen?.volverA && (
        <Button
          variant="outline"
          colorPalette="green"
          size="sm"
          mb={4}
          onClick={() => navigate(origen.volverA as string)}
        >
          <FiArrowLeft /> {origen.volverEtiqueta ?? "Volver"}
        </Button>
      )}

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
          "& input:not([type='date'])": {
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aplicarFiltros(e.currentTarget.value);
              }
            }}
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
          <FiltroTexto
            ariaLabel="Buscar por lote de insumo"
            placeholder="Lote de insumo (ej. H-099)"
            value={loteInsumoFiltro}
            onChange={setLoteInsumoFiltro}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aplicarFiltros();
              }
            }}
          />
          <Flex
            direction={{ base: "column", sm: "row" }}
            align={{ base: "stretch", sm: "center" }}
            gap={2}
            w={{ base: "100%", xl: "auto" }}
          >
            <HStack gap={2} align="center" flex={{ base: "1", sm: "none" }}>
              <Text fontSize="xs" color="gray.600" whiteSpace="nowrap" minW={{ base: "45px", sm: "auto" }}>
                Desde:
              </Text>
              <Input
                type="date"
                size="sm"
                value={desdeFiltro}
                max={hastaFiltro && hastaFiltro < hoy ? hastaFiltro : hoy}
                onChange={(e) => handleCambiarDesde(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    aplicarFiltros();
                  }
                }}
                borderRadius="md"
                bg="white"
                w={{ base: "100%", sm: "9.5rem" }}
                minW={{ base: "0", sm: "9.5rem" }}
                flex="1"
              />
            </HStack>
            <HStack gap={2} align="center" flex={{ base: "1", sm: "none" }}>
              <Text fontSize="xs" color="gray.600" whiteSpace="nowrap" minW={{ base: "45px", sm: "auto" }}>
                Hasta:
              </Text>
              <Input
                type="date"
                size="sm"
                value={hastaFiltro}
                min={desdeFiltro || undefined}
                max={hoy}
                onChange={(e) => handleCambiarHasta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    aplicarFiltros();
                  }
                }}
                borderRadius="md"
                bg="white"
                w={{ base: "100%", sm: "9.5rem" }}
                minW={{ base: "0", sm: "9.5rem" }}
                flex="1"
              />
            </HStack>
          </Flex>
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
            filtrosAplicados.lote_insumo
              ? `No existen lotes de producción vinculados al lote de insumo "${filtrosAplicados.lote_insumo}".`
              : hayFiltrosActivos
                ? "No se encontraron lotes que coincidan con los filtros aplicados."
                : "No hay lotes de producción registrados en el sistema."
          }
        />
      ) : (
        <>
          <ListadoLotes
            lotes={itemsPaginados}
            exportarLotes={lotes}
            exportarFiltros={armarFiltros([
              ["Búsqueda", filtrosAplicados.busqueda],
              [
                "Producto",
                filtrosAplicados.producto_id &&
                  (productos.find((p) => String(p.id) === filtrosAplicados.producto_id)?.nombre ??
                    filtrosAplicados.producto_id),
              ],
              ["Lote de insumo", filtrosAplicados.lote_insumo],
              ["Desde", filtrosAplicados.desde && formatearFecha(filtrosAplicados.desde)],
              ["Hasta", filtrosAplicados.hasta && formatearFecha(filtrosAplicados.hasta)],
            ])}
            onVer={setLoteSeleccionado}
            mostrarOperador={true}
            hayFiltrosActivos={hayFiltrosActivos}
            codigoLoteInsumoFiltro={filtrosAplicados.lote_insumo}
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