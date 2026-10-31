import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { useMemo, useState } from "react";
import { Badge, Box, HStack, Button } from "@chakra-ui/react";
import {
  FiTrash2,
  FiEdit2,
  FiEye,
  FiCheckCircle,
  FiPlus,
  FiSettings,
  FiRefreshCw,
} from "react-icons/fi";
import { MdOutlineCleaningServices } from "react-icons/md";
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
import type { ElementoLimpieza } from "./types";
import { ProximoRecambio } from "../recambios/ProximoRecambio";
import type { AlertaRecambio } from "../recambios/types";
import type { ColumnDef } from "../../components/ui";

interface ListadoElementosLimpiezaProps {
  onCrear?: () => void;
  onCrearTipo?: () => void;
  onModificar?: (elemento: ElementoLimpieza) => void;
  onEliminar?: (elemento: ElementoLimpieza) => void;
  onVer?: (elemento: ElementoLimpieza) => void;
  onDarAlta?: (elemento: ElementoLimpieza) => void;
  onRegistrarRecambio?: (elemento: ElementoLimpieza) => void;
}

type FiltrosElemento = { estado: string };

const FILTROS_INICIALES: FiltrosElemento = { estado: "activos" };

const OPCIONES_ESTADO = [
  { label: "Activos", value: "activos" },
  { label: "Inactivos", value: "inactivos" },
  { label: "Todos", value: "todos" },
];

const formatearFecha = (fechaStr?: string | null) => {
  if (!fechaStr) return "—";
  try {
    return new Date(fechaStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fechaStr;
  }
};

// Arma el endpoint del listado: solo se mandan los filtros que tienen valor.
const construirEndpoint = (filtros: FiltrosElemento, busqueda: string) => {
  const params = new URLSearchParams();
  if (filtros.estado === "activos") params.set("activo", "true");
  if (filtros.estado === "inactivos") params.set("activo", "false");
  if (busqueda) params.set("busqueda", busqueda);

  const query = params.toString();
  return `${BASE_URL}/elementos-limpieza/${query ? `?${query}` : ""}`;
};

export const ListadoElementosLimpieza = ({
  onCrear,
  onCrearTipo,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onRegistrarRecambio,
}: ListadoElementosLimpiezaProps) => {
  // Borrador: lo que el usuario está por aplicar. Aplicados: lo único que llega al endpoint.
  const [borrador, setBorrador] = useState<FiltrosElemento>(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState<FiltrosElemento>(FILTROS_INICIALES);

  // Texto del input (inmediato) y texto que realmente viaja al backend (con debounce)
  const [busqueda, setBusqueda] = useState("");
  const busquedaAplicada = useDebounce(busqueda.trim(), 300);

  // La página vuelve a 1 sola cuando cambia el endpoint (estado o búsqueda)
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<ElementoLimpieza>({
      endpoint: construirEndpoint(aplicados, busquedaAplicada),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de elementos de limpieza.",
    });

  // La próxima fecha y el semáforo los calcula el backend; se cruzan por id de elemento
  const { data: alertas } = useListadoData<AlertaRecambio>({
    endpoint: `${BASE_URL}/recambios/alertas`,
    errorMessage: "No se pudieron cargar las alertas de recambio.",
  });
  const alertaPorElemento = useMemo(
    () => new Map(alertas.map((a) => [a.elemento.id, a])),
    [alertas],
  );

  const hayFiltros =
    busqueda !== "" || borrador.estado !== FILTROS_INICIALES.estado;
  const hayAplicados =
    busquedaAplicada !== "" || aplicados.estado !== FILTROS_INICIALES.estado;

  const aplicar = () => setAplicados(borrador);

  const limpiar = () => {
    setBusqueda("");
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
  };

  const columnas: ColumnDef<ElementoLimpieza>[] = [
    {
      key: "codigo",
      label: "Código",
      w: "110px",
      truncate: true,
      render: (e) => e.codigo,
    },
    {
      key: "nombre",
      label: "Nombre",
      w: "220px",
      truncate: true,
      render: (e) => e.nombre,
    },
    {
      key: "asociado_a",
      label: "Asociado a",
      w: "160px",
      render: (e) => {
        if (e.sector)
          return (
            <Badge colorPalette='blue' variant='subtle'>
              Sector: {e.sector.nombre}
            </Badge>
          );
        if (e.equipo)
          return (
            <Badge colorPalette='purple' variant='subtle'>
              Equipo: {e.equipo.nombre}
            </Badge>
          );
        return (
          <span style={{ color: "var(--chakra-colors-gray-400)" }}>
            Sin asignar
          </span>
        );
      },
    },
    {
      key: "frecuencia",
      label: "Frecuencia (días)",
      w: "130px",
      render: (e) =>
        e.frecuencia_recambio_dias ? `${e.frecuencia_recambio_dias} días` : "—",
    },
    {
      key: "ultimo_recambio",
      label: "Último Recambio",
      w: "140px",
      render: (e) => formatearFecha(e.fecha_ultimo_recambio),
    },
    {
      key: "proximo_recambio",
      label: "Próximo Recambio",
      w: "150px",
      render: (e) => <ProximoRecambio alerta={alertaPorElemento.get(e.id)} />,
    },
    {
      key: "activo",
      label: "Estado",
      w: "100px",
      render: (e) => (
        <Badge colorPalette={e.activo ? "green" : "red"}>
          {e.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      w: "200px",
      render: (e) => (
        <RowActions>
          <RowActionButton
            icon={FiRefreshCw}
            label='Registrar recambio'
            colorPalette='teal'
            onClick={() => onRegistrarRecambio?.(e)}
            visible={e.activo && !!e.frecuencia_recambio_dias}
          />
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(e)}
            visible={e.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(e)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(e)}
            visible={e.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(e)}
            visible={!e.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer maxW='6xl'>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader
          title='Elementos de Limpieza'
          icon={MdOutlineCleaningServices}
        />
        <HStack gap={2}>
          <Button variant='outline' colorPalette='green' onClick={onCrearTipo}>
            <FiSettings /> Gestionar tipos
          </Button>
          <Button colorPalette='green' onClick={onCrear}>
            <FiPlus /> Nuevo elemento
          </Button>
        </HStack>
      </HStack>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar elemento de limpieza'
            placeholder='Nombre, código o ubicación'
            value={busqueda}
            onChange={setBusqueda}
          />
          <FiltroSelect
            ariaLabel='Estado del elemento'
            placeholder='Estado'
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) => setBorrador({ ...borrador, estado: valor })}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando elementos de limpieza...' />}
      {!loading && error && <AlertMessage type='error' message={error} />}
      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            hayAplicados
              ? "No hay elementos de limpieza que coincidan con la búsqueda o los filtros seleccionados."
              : "No hay elementos de limpieza para mostrar."
          }
        />
      )}
      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(e) => e.id}
            minW='1210px'
          />
          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='elemento'
            labelPlural='elementos'
          />
        </>
      )}
    </ListadoContainer>
  );
};