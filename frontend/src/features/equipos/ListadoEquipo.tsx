import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { useState } from "react";
import { Badge, Button, Box, HStack, Text, VStack } from "@chakra-ui/react";
import {
  FiThermometer,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiEye,
  FiFilePlus,
  FiPlus,
} from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  FiltroSelect,
  FiltrosBar,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { useDebounce } from "../../hooks/useDebounce";
import type { Equipo } from "./types";
import type { Sector } from "../sectores/types";
import type { ColumnDef } from "../../components/ui";

const formatearFechaISO = (fecha: string | null | undefined) => {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
};

const renderProximaCalibracion = (equipo: Equipo) => {
  if (!equipo.frecuencia_calibracion_dias || !equipo.fecha_ultima_calibracion) {
    return <Text>—</Text>;
  }

  const [anio, mes, dia] = equipo.fecha_ultima_calibracion
    .split("-")
    .map(Number);
  const ultima = new Date(anio, mes - 1, dia);
  const proxima = new Date(ultima);
  proxima.setDate(proxima.getDate() + equipo.frecuencia_calibracion_dias);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTiempo = proxima.getTime() - hoy.getTime();
  const diasRestantes = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

  let color: string;
  let leyenda = "";

  if (diasRestantes < 0) {
    color = "red";
    leyenda = "(Vencido)";
  } else if (diasRestantes <= 15) {
    color = "yellow";
    leyenda = diasRestantes === 0 ? "(Hoy)" : `(En ${diasRestantes} días)`;
  } else {
    color = "green";
  }

  const proximaStr = `${String(proxima.getDate()).padStart(2, "0")}/${String(
    proxima.getMonth() + 1,
  ).padStart(2, "0")}/${proxima.getFullYear()}`;

  return (
    <VStack gap={0} align='start'>
      <HStack gap={2}>
        <Box
          w={3}
          h={3}
          borderRadius='full'
          bg={`${color}.500`}
          flexShrink={0}
        />
        <Text>{proximaStr}</Text>
      </HStack>
      {leyenda && (
        <Text fontSize='sm' fontStyle='italic' color='gray.500'>
          {leyenda}
        </Text>
      )}
    </VStack>
  );
};

type FiltrosEquipo = {
  estado: string;
  sectorId: string;
  vencimiento: string;
};

const FILTROS_INICIALES: FiltrosEquipo = {
  estado: "",
  sectorId: "",
  vencimiento: "",
};

// Arma el endpoint del listado: solo se mandan los filtros que tienen valor.
const construirEndpoint = (filtros: FiltrosEquipo, busqueda: string) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (filtros.estado === "activos") params.set("activo", "true");
  if (filtros.estado === "inactivos") params.set("activo", "false");
  if (filtros.sectorId) params.set("sector_id", filtros.sectorId);
  if (filtros.vencimiento) params.set("vencimiento", filtros.vencimiento);

  const query = params.toString();
  return `${BASE_URL}/equipos/${query ? `?${query}` : ""}`;
};

interface ListadoEquiposProps {
  onCrear?: () => void;
  onModificar?: (equipo: Equipo) => void;
  onEliminar?: (equipo: Equipo) => void;
  onVer?: (equipo: Equipo) => void;
  onDarAlta?: (equipo: Equipo) => void;
  onRegistrarCalibracion?: (equipo: Equipo) => void;
}

export const ListadoEquipos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onRegistrarCalibracion,
}: ListadoEquiposProps) => {
  // Borrador: lo que el usuario está por aplicar. Aplicados: lo único que llega al endpoint.
  const [borrador, setBorrador] = useState<FiltrosEquipo>(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState<FiltrosEquipo>(FILTROS_INICIALES);

  // Texto del input (inmediato) y texto que realmente viaja al backend (con debounce)
  const [busqueda, setBusqueda] = useState("");
  const busquedaAplicada = useDebounce(busqueda.trim(), 300);

  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Equipo>({
      endpoint: construirEndpoint(aplicados, busquedaAplicada),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de equipos.",
    });

  // Sectores para poblar el filtro. Se traen todos (incluso inactivos) para
  // poder filtrar equipos que hayan quedado en un sector dado de baja.
  const { data: sectores } = useListadoData<Sector>({
    endpoint: `${BASE_URL}/sectores/`,
    errorMessage: "No se pudieron cargar los sectores.",
  });

  const hayFiltros =
    busqueda !== "" || Object.values(borrador).some((valor) => valor !== "");
  const hayAplicados =
    busquedaAplicada !== "" || Object.values(aplicados).some((valor) => valor !== "");

  // Cada aplicación vuelve a la primera página, para no caer en una página vacía.
  const aplicar = () => {
    setAplicados(borrador);
    setPage(1);
  };

  const limpiar = () => {
    setBusqueda("");
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setPage(1);
  };

  const columnas: ColumnDef<Equipo>[] = [
    {
      key: "codigo",
      label: "Código",
      render: (equipo) => equipo.numero_serie,
    },
    {
      key: "nombre",
      label: "Nombre",
      render: (equipo) => (
        <VStack align='start' gap={0}>
          <Text>{equipo.nombre}</Text>
          <Text fontSize='xs' color='gray.500'>
            {equipo.marca}
          </Text>
        </VStack>
      ),
    },
    {
      key: "asociado_a",
      label: "Asociado a",
      render: (equipo) => (
        <Badge colorPalette='blue'>Sector: {equipo.sector.nombre}</Badge>
      ),
    },
    {
      key: "frecuencia",
      label: "Frecuencia (días)",
      render: (equipo) =>
        equipo.frecuencia_calibracion_dias
          ? `${equipo.frecuencia_calibracion_dias} Días`
          : "—",
    },
    {
      key: "ultima_calibracion",
      label: "Última Calibración",
      render: (equipo) => formatearFechaISO(equipo.fecha_ultima_calibracion),
    },
    {
      key: "proxima_calibracion",
      label: "Próxima Calibración",
      render: (equipo) => renderProximaCalibracion(equipo),
    },
    {
      key: "activo",
      label: "Estado",
      render: (equipo) => (
        <Badge colorPalette={equipo.activo ? "green" : "red"}>
          {equipo.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (equipo) => (
        <RowActions>
          <RowActionButton
            icon={FiFilePlus}
            label='Registrar calibración'
            title='Registrar calibracion del equipo'
            colorPalette='purple'
            onClick={() => onRegistrarCalibracion?.(equipo)}
            visible={equipo.activo}
          />
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            title='Modificar el equipo'
            colorPalette='blue'
            onClick={() => onModificar?.(equipo)}
            visible={equipo.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            title='Ver detalle del equipo'
            colorPalette='yellow'
            onClick={() => onVer?.(equipo)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            title='Dar de baja el equipo'
            colorPalette='red'
            onClick={() => onEliminar?.(equipo)}
            visible={equipo.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            title='Dar de alta el equipo'
            colorPalette='green'
            onClick={() => onDarAlta?.(equipo)}
            visible={!equipo.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer maxW='6xl'>
      <ListadoHeader title='Equipos' icon={FiThermometer}>
        {onCrear && (
          <Button colorPalette='green' onClick={onCrear}>
            <FiPlus /> Nuevo equipo
          </Button>
        )}
      </ListadoHeader>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar equipo'
            placeholder='Nombre, marca o N° de serie'
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Estado del equipo'
            placeholder='Todos los estados'
            options={[
              { label: "Activos", value: "activos" },
              { label: "Inactivos", value: "inactivos" },
            ]}
            value={borrador.estado}
            onChange={(valor) => setBorrador({ ...borrador, estado: valor })}
          />
          <FiltroSelect
            ariaLabel='Sector'
            placeholder='Todos los sectores'
            options={sectores.map((sector) => ({
              label: sector.nombre,
              value: String(sector.id),
            }))}
            value={borrador.sectorId}
            onChange={(valor) => setBorrador({ ...borrador, sectorId: valor })}
          />
          <FiltroSelect
            ariaLabel='Estado de calibración'
            placeholder='Todos los vencimientos'
            options={[
              { label: "Vencidos", value: "vencido" },
              { label: "Próximos a vencer", value: "proximo" },
              { label: "Vigentes", value: "al_dia" },
            ]}
            value={borrador.vencimiento}
            onChange={(valor) =>
              setBorrador({ ...borrador, vencimiento: valor })
            }
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando equipos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            hayAplicados
              ? "No hay equipos que coincidan con los filtros seleccionados."
              : "Todavía no hay equipos cargados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(equipo) => equipo.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='equipo'
            labelPlural='equipos'
          />
        </>
      )}
    </ListadoContainer>
  );
};
