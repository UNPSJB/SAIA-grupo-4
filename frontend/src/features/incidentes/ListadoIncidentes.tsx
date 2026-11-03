import { useMemo, useState } from "react";
import { Box, Button, Card, Dialog, HStack, Image, Portal, Text, VStack } from "@chakra-ui/react";
import { 
    FiEye,
    FiImage,
    FiPlus,
    FiSettings,
    FiAlertTriangle,
    FiX,
    FiCheckCircle,
    FiRotateCcw,
    FiCalendar,
    FiUser,
    FiTag,
} from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  SemaforoLegend,
  TablePagination,
} from "../../components/ui";
import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Incidente } from "./types";
import type { ColumnDef } from "../../components/ui";
import {
  FiltroSelect,
  FiltroTexto,
  FiltrosBar,
} from "../../components/ui";
import { EstadoIncidenteBadge } from "./EstadoIncidenteBadge";
import { SemaforoFechaIncidente } from "./SemaforoFechaIncidente";

interface ListadoIncidentesProps {
  onVer?: (incidente: Incidente) => void;
  onGestionarTipos?: () => void;
  onCrear?: () => void;
  onCerrar?: (incidente: Incidente) => void;
  onReabrir?: (incidente: Incidente) => void;
  tipoId?: number | null;
  desde?: string;
  hasta?: string;
  endpoint?: string;
  titulo?: string;
  refreshKey?: number;
  /** Habilita vista responsiva: tabla en desktop, tarjetas en móvil. */
  responsive?: boolean;
}

const ENDPOINT = `${BASE_URL}/incidentes/`;

const obtenerUrlFoto = (fotoUrl: string) =>
  /^https?:\/\//i.test(fotoUrl)
    ? fotoUrl
    : `${BASE_URL}/${fotoUrl.replace(/^\/+/, "")}`;

// Búsqueda local sin distinguir mayúsculas ni acentos.
const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const ListadoIncidentes = ({
  onVer,
  onGestionarTipos,
  onCrear,
  endpoint = ENDPOINT,
  titulo = "Listado de Incidentes",
  onCerrar,
  onReabrir,
  tipoId,
  desde,
  hasta,
  refreshKey,
  responsive = false
}: ListadoIncidentesProps) => {
  // Búsqueda: se escribe en borrador y se aplica con Enter o "Filtrar" (filtrado local).
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");
  const [estadoAplicado, setEstadoAplicado] = useState("");

  const [incidenteConFoto, setIncidenteConFoto] = useState<Incidente | null>(null);
  const parametros = new URLSearchParams();
  if (tipoId !== undefined && tipoId !== null) {
    parametros.set("tipo_id", String(tipoId));
  }
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  const endpointFiltrado = parametros.toString()
    ? `${endpoint}?${parametros.toString()}`
    : endpoint;
  const filtrado = parametros.toString().length > 0;

  const { data, loading, error, page, setPage } =
    useListadoData<Incidente>({
      endpoint: endpointFiltrado,
      pageSize: ITEMS_POR_PAGINA,
      refreshKey,
      errorMessage: "No se pudo cargar la lista de incidentes.",
    });

  // Solo mostramos el spinner en la primera carga: en los refrescos en segundo
  // plano (refreshKey) conservamos la tabla para evitar el parpadeo.
  const primerCarga = loading && data.length === 0;

  const incidentesFiltrados = useMemo(() => {
    const termino = normalizarTexto(busquedaAplicada);

    return data.filter((incidente) => {
      if (estadoAplicado === "abierto" && !incidente.abierto) return false;
      if (estadoAplicado === "cerrado" && incidente.abierto) return false;
      if (!termino) return true;

      const campos = [
        incidente.titulo,
        incidente.descripcion,
        incidente.tipo?.nombre,
        incidente.reportante?.nombre,
        incidente.reportante?.apellido,
      ];

      return campos.some((campo) =>
        normalizarTexto(campo ?? "").includes(termino),
      );
    });
  }, [data, estadoAplicado, busquedaAplicada]);

  const itemsFiltradosPaginados = incidentesFiltrados.slice(
    (page - 1) * ITEMS_POR_PAGINA,
    page * ITEMS_POR_PAGINA,
  );

  const hayFiltros =
    busqueda.trim() !== "" ||
    estadoSeleccionado !== "";

  const aplicarFiltros = (busquedaManual?: string) => {
    const texto = typeof busquedaManual === "string" ? busquedaManual : busqueda;
    setBusquedaAplicada(texto.trim());
    setEstadoAplicado(estadoSeleccionado);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setEstadoSeleccionado("");
    setEstadoAplicado("");
    setPage(1);
  };

  const columnas: ColumnDef<Incidente>[] = [
    {
      key: "titulo",
      label: "Título",
      render: (incidente) => incidente.titulo,
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (incidente) => incidente.descripcion,
    },
    {
      key: "fecha",
      label: "Fecha",
      render: (incidente) => (
        <SemaforoFechaIncidente fecha={incidente.fecha_hora_reporte} />
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (incidente) => (
        <EstadoIncidenteBadge abierto={incidente.abierto} />
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (incidente) => (
        <RowActions>
            {incidente.foto_url && (
              <RowActionButton
                icon={FiImage}
                label="Ver foto"
                colorPalette="blue"
                onClick={() => setIncidenteConFoto(incidente)}
              />
            )}
            <RowActionButton 
              icon={FiEye}
              label="Ver"
              colorPalette="yellow"
              onClick={() => onVer?.(incidente)} 
            />
          {incidente.abierto ? (
            <RowActionButton
              icon={FiCheckCircle}
              label="Cerrar"
              colorPalette="green"
              onClick={() => onCerrar?.(incidente)}
            />
          ) : (
            <RowActionButton
              icon={FiRotateCcw}
              label="Reabrir"
              colorPalette="orange"
              onClick={() => onReabrir?.(incidente)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title={titulo} icon={FiAlertTriangle}/>
        <HStack gap={2}>
          {onGestionarTipos && (
            <Button variant='outline' colorPalette='green' onClick={onGestionarTipos}>
              <FiSettings /> Gestionar Tipos
            </Button>
          )}
          {onCrear && (
          <Button variant='solid' colorPalette='green' onClick={onCrear}>
            <FiPlus /> Registrar Incidente
          </Button>
          )}
        </HStack>
      </HStack>
      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
          hayFiltrosActivos={hayFiltros}
        >
          <FiltroTexto
            ariaLabel="Buscar incidente"
            placeholder="Título, descripción, tipo o reportante"
            value={busqueda}
            onChange={(valor) => {
              setBusqueda(valor);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aplicarFiltros(e.currentTarget.value);
              }
            }}
          />
          <FiltroSelect
            ariaLabel="Filtrar por estado"
            placeholder="Todos los estados"
            value={estadoSeleccionado}
            onChange={setEstadoSeleccionado}
            options={[
              { label: "Pendientes", value: "abierto" },
              { label: "Resueltos", value: "cerrado" },
            ]}
          />
        </FiltrosBar>
      </Box>
    
      {primerCarga && <LoadingState message="Cargando incidentes..." />}

      {!primerCarga && error && <AlertMessage type="error" message={error} />}

      {!primerCarga && !error && data.length === 0 && (
        <AlertMessage
          type="info"
          message={
            filtrado
              ? "No hay incidentes de este tipo en el período seleccionado."
              : "Todavía no hay incidentes reportados."
          }
        />
      )}

      {!primerCarga &&
        !error &&
        data.length > 0 &&
        incidentesFiltrados.length === 0 && (
          <AlertMessage
            type="info"
            message="No hay incidentes que coincidan con los filtros."
          />
        )}

      {!primerCarga && !error && incidentesFiltrados.length > 0 && (
        <>
          {/* Tabla: tablet y escritorio */}
          <Box display={{ base: responsive ? "none" : "block", md: "block" }}>
            <DataTable
              items={itemsFiltradosPaginados}
              columns={columnas}
              getRowKey={(incidente) => incidente.id}
            />
          </Box>

          {/* Tarjetas: móvil (solo si responsive=true) */}
          {responsive && (
            <VStack
              display={{ base: "flex", md: "none" }}
              align="stretch"
              gap={3}
            >
              {itemsFiltradosPaginados.map((incidente) => (
                <Card.Root key={incidente.id} variant="outline">
                  <Card.Body gap={2}>
                    <HStack justify="space-between" align="flex-start" gap={2}>
                      <Text fontWeight="bold" color="green.700" truncate>
                        {incidente.titulo}
                      </Text>
                      <EstadoIncidenteBadge abierto={incidente.abierto} />
                    </HStack>
                    <HStack gap={4} flexWrap="wrap">
                      <HStack gap={1} align="center">
                        <FiCalendar size={14} color="gray.500" />
                        <Text fontSize="sm" color="gray.600">
                          {new Date(incidente.fecha_hora_reporte).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </Text>
                      </HStack>
                      {incidente.tipo && (
                        <HStack gap={1} align="center">
                          <FiTag size={14} color="gray.500" />
                          <Text fontSize="sm" color="gray.600">
                            {incidente.tipo.nombre}
                          </Text>
                        </HStack>
                      )}
                      {incidente.reportante && (
                        <HStack gap={1} align="center">
                          <FiUser size={14} color="gray.500" />
                          <Text fontSize="sm" color="gray.600">
                            {incidente.reportante.nombre} {incidente.reportante.apellido}
                          </Text>
                        </HStack>
                      )}
                    </HStack>
                    <HStack justify="flex-end" gap={2} mt={2}>
                      {incidente.foto_url && (
                        <RowActionButton
                          icon={FiImage}
                          label="Ver foto"
                          colorPalette="blue"
                          onClick={() => setIncidenteConFoto(incidente)}
                        />
                      )}
                      <RowActionButton
                        icon={FiEye}
                        label="Ver"
                        colorPalette="yellow"
                        onClick={() => onVer?.(incidente)}
                      />
                      {incidente.abierto ? (
                        <RowActionButton
                          icon={FiCheckCircle}
                          label="Cerrar"
                          colorPalette="green"
                          onClick={() => onCerrar?.(incidente)}
                        />
                      ) : (
                        <RowActionButton
                          icon={FiRotateCcw}
                          label="Reabrir"
                          colorPalette="orange"
                          onClick={() => onReabrir?.(incidente)}
                        />
                      )}
                    </HStack>
                  </Card.Body>
                </Card.Root>
              ))}
            </VStack>
          )}

          <SemaforoLegend
            etiquetas={{
              vigente: "Reciente (menos de 7 días)",
              proximo: "Entre 7 y 29 días",
              vencido: "30 días o más",
            }}
            ariaLabel="Leyenda de antigüedad de los incidentes"
          />

          <TablePagination
            count={incidentesFiltrados.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular="incidente"
            labelPlural="incidentes"
          />
        </>
      )}

      <Dialog.Root
        open={incidenteConFoto !== null}
        onOpenChange={(e) => !e.open && setIncidenteConFoto(null)}
        size="xl"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  Foto del incidente{incidenteConFoto ? `: ${incidenteConFoto.titulo}` : ""}
                </Dialog.Title>
                <Dialog.CloseTrigger 
                  _hover={{ color: "red.500", bg: "red.50" }}
                  transition='background 0.2s, color 0.2s'
                  cursor='pointer'
                >
                  <FiX />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                {incidenteConFoto?.foto_url && (
                  <Image
                    src={obtenerUrlFoto(incidenteConFoto.foto_url)}
                    alt={`Foto del incidente ${incidenteConFoto.titulo}`}
                    maxH="75vh"
                    w="100%"
                    objectFit="contain"
                  />
                )}
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </ListadoContainer>
  );
};