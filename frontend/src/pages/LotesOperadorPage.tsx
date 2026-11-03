import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Flex, HStack, Input, Text } from "@chakra-ui/react";
import { FiBox } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import {
  AlertMessage,
  FiltroSelect,
  FiltroTexto,
  FiltrosBar,
  FormModal,
  TablePagination,
} from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { ITEMS_POR_PAGINA } from "../config";
import { lotesApi } from "../features/lotes/hooks/lotesApi";
import { ListadoLotes } from "../features/lotes/ListadoLotes";
import { LoteDetalle } from "../features/lotes/LoteDetalle";
import { RegistrarLoteForm } from "../features/lotes/RegistrarLoteForm";
import type { Lote, ProductoDisponibleLote } from "../features/lotes/types";

export default function LotesOperadorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productos, setProductos] = useState<ProductoDisponibleLote[]>([]);

  // Filtros borradores
  const [busquedaDraft, setBusquedaDraft] = useState("");
  const [productoIdDraft, setProductoIdDraft] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");

  // Filtros aplicados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busqueda: "",
    productoId: "",
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

  // Modal para registrar lote
  const [crearAbierto, setCrearAbierto] = useState<boolean>(() => {
    return searchParams.get("crear") === "true";
  });

  // Catálogo de productos con receta activa para el filtro
  useEffect(() => {
    lotesApi.getProductosDisponibles().then(setProductos).catch(() => {});
  }, []);

  const cargarLotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await lotesApi.getMisLotes({
        busqueda: filtrosAplicados.busqueda || undefined,
        producto_id: filtrosAplicados.productoId ? Number(filtrosAplicados.productoId) : undefined,
        desde: filtrosAplicados.desde || undefined,
        hasta: filtrosAplicados.hasta || undefined,
      });

      setLotes(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los lotes de producción.");
    } finally {
      setLoading(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  const aplicarFiltros = (busquedaManual?: string) => {
    const texto = typeof busquedaManual === "string" ? busquedaManual : busquedaDraft;
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

    setFiltrosAplicados({
      busqueda: texto.trim(),
      productoId: productoIdDraft,
      desde,
      hasta,
    });
    setPage(1);
  };

  const limpiarFiltros = () => {
    setBusquedaDraft("");
    setProductoIdDraft("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setFiltrosAplicados({
      busqueda: "",
      productoId: "",
      desde: "",
      hasta: "",
    });
    setPage(1);
  };

  const hayFiltrosActivos = useMemo(() => {
    return (
      filtrosAplicados.busqueda !== "" ||
      filtrosAplicados.productoId !== "" ||
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

  const handleCerrarCrear = () => {
    setCrearAbierto(false);
    if (searchParams.get("crear")) {
      searchParams.delete("crear");
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <ListadoContainer maxW="8xl">
      <ListadoHeader
        title="Lotes de Producción"
        icon={FiBox}
        buttonLabel="Nuevo Lote"
        onCrear={() => setCrearAbierto(true)}
      />

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
              ariaLabel="Buscar por código de lote o producto"
              placeholder="Buscar por código de lote o producto..."
              value={busquedaDraft}
              onChange={setBusquedaDraft}
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
              value={productoIdDraft}
              onChange={setProductoIdDraft}
              options={productos.map((p) => ({
                label: p.nombre,
                value: String(p.id),
              }))}
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

        {error && (
          <Box mb={4}>
            <AlertMessage type="error" message={error} />
          </Box>
        )}

        <ListadoLotes
          lotes={itemsPaginados}
          loading={loading}
          onVer={setLoteSeleccionado}
          mostrarOperador={false}
          hayFiltrosActivos={hayFiltrosActivos}
        />

        {!loading && lotes.length > 0 && (
          <Box mt={4}>
            <TablePagination
              count={lotes.length}
              pageSize={ITEMS_POR_PAGINA}
              page={paginaActual}
              onPageChange={setPage}
              labelSingular="lote"
              labelPlural="lotes"
            />
          </Box>
        )}

        {/* Modal de Detalle */}
        {loteSeleccionado && (
          <LoteDetalle
            lote={loteSeleccionado}
            onCerrar={() => setLoteSeleccionado(null)}
          />
        )}

        {/* Modal para Registrar Lote con botón X */}
        {crearAbierto && (
          <FormModal
            open={crearAbierto}
            onClose={handleCerrarCrear}
            showClose
          >
            <RegistrarLoteForm
              onSuccess={() => {
                handleCerrarCrear();
                cargarLotes();
              }}
              onCancelar={handleCerrarCrear}
            />
          </FormModal>
        )}
      </ListadoContainer>
  );
}
