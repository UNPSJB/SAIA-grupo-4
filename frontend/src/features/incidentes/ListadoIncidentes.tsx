import { useMemo, useState } from "react";
import { Badge, Button, Dialog, HStack, Image, Portal } from "@chakra-ui/react";
import { 
    FiEye,
    FiImage,
    FiPlus,
    FiSettings,
    FiAlertTriangle,
    FiX,
} from "react-icons/fi"; // Importar otros íconos según sea necesario
import {
    AlertMessage,
    DataTable,
    LoadingState,
    RowActionButton,
    RowActions,
    TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Incidente } from "./types";
import type { ColumnDef } from "../../components/ui";
import { FiltroSelect, FiltrosBar } from "../../components/ui";

interface ListadoIncidentesProps {
    onVer?: (incidente: Incidente) => void;
    onGestionarTipos?: () => void;
    onCrear?: () => void;
    // Agregar las props del listado
}

const API_BASE_URL = "http://127.0.0.1:8000";
const ENDPOINT = `${API_BASE_URL}/incidentes/`;
const ITEMS_POR_PAGINA = 5;

const obtenerUrlFoto = (fotoUrl: string) =>
  /^https?:\/\//i.test(fotoUrl)
    ? fotoUrl
    : `${API_BASE_URL}/${fotoUrl.replace(/^\/+/, "")}`;

const formatearFecha = (fecha: string) => {
  const fechaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha)
    ? fecha
    : `${fecha}Z`;

  return new Date(fechaConZona).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
};

const obtenerColorFecha = (
  fecha: string,
): "green" | "yellow" | "red" | "gray" => {
  const fechaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha)
    ? fecha
    : `${fecha}Z`;
  const fechaReporte = new Date(fechaConZona);

  if (Number.isNaN(fechaReporte.getTime())) return "gray";

  const diasTranscurridos = Math.floor(
    (Date.now() - fechaReporte.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasTranscurridos >= 30) return "red";
  if (diasTranscurridos >= 7) return "yellow";
  return "green";
};

export const ListadoIncidentes = ({
    onVer,
    onGestionarTipos,
    onCrear,
    // Agregar las props del listado
}: ListadoIncidentesProps) => {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");
  const [estadoAplicado, setEstadoAplicado] = useState("");

  const [incidenteConFoto, setIncidenteConFoto] = useState<Incidente | null>(null);
  const { data, loading, error, page, setPage } =
    useListadoData<Incidente>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de incidentes.",
    });

  const incidentesFiltrados = useMemo(() => 
    data.filter((incidente) => {
      if (estadoAplicado === "abierto") return incidente.abierto; // Muestra solo los abiertos
      if (estadoAplicado === "cerrado") return !incidente.abierto; // Muestra solo los cerrados
      return true; // Muestra todos los incidentes
    }),
    [data, estadoAplicado],
  );

  const itemsFiltradosPaginados = incidentesFiltrados.slice(
    (page - 1) * ITEMS_POR_PAGINA,
    page * ITEMS_POR_PAGINA,
  );

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
        <Badge colorPalette={obtenerColorFecha(incidente.fecha_hora_reporte)}>
          {formatearFecha(incidente.fecha_hora_reporte)}
        </Badge>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (incidente) => (
        <Badge colorPalette={incidente.abierto ? "green" : "red"}>
            {incidente.abierto ? "Abierto" : "Cerrado"}
        </Badge>
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
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title="Listado de Incidentes" icon={FiAlertTriangle}/>
        <HStack gap={2}>
          <Button variant='outline' colorPalette='green' onClick={onGestionarTipos}>
            <FiSettings /> Gestionar Tipos
          </Button>
          {onCrear && (
          <Button variant='solid' colorPalette='green' onClick={onCrear}>
            <FiPlus /> Registrar Incidente
          </Button>
          )}
        </HStack>
      </HStack>
      <FiltrosBar
          onAplicar={() => {
            setEstadoAplicado(estadoSeleccionado);
            setPage(1);
          }}
          onLimpiar={() => {
            setEstadoSeleccionado("");
            setEstadoAplicado("");
            setPage(1);
          }}
          hayFiltrosActivos={estadoAplicado !== ""}
        >
          <FiltroSelect
            ariaLabel="Filtrar por estado"
            placeholder="Todos los estados"
            value={estadoSeleccionado}
            onChange={setEstadoSeleccionado}
            options={[
              { label: "Abiertos", value: "abierto" },
              { label: "Cerrados", value: "cerrado" },
            ]}
          />
        </FiltrosBar>
    
      {loading && <LoadingState message="Cargando incidentes..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage type="info" message="Todavía no hay incidentes reportados." />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsFiltradosPaginados}
            columns={columnas}
            getRowKey={(incidente) => incidente.id}
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