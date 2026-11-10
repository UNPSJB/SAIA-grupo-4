import { BASE_URL, ITEMS_POR_PAGINA, ITEMS_SELECT } from "../../config";
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
  SemaforoLegend,
  TablePagination,
  textoSemaforo,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { ElementoLimpieza } from "./types";
import type { Sector } from "../sectores/types";
import type { Equipo } from "../equipos/types";
import { ProximoRecambio } from "../recambios/ProximoRecambio";
import type { AlertaRecambio } from "../recambios/types";
import type { ColumnDef } from "../../components/ui";
import { armarFiltros, etiquetaOpcion } from "../../utils/exportacion";
import type { EstadoSemaforo } from "../../components/ui";
import type { EstadoRecambio } from "../recambios/types";
// La local formatearFecha pasa por Date (UTC); para "YYYY-MM-DD" se usa la común.
import { formatearFecha as fechaDDMMAAAA } from "../../utils/fecha";

interface ListadoElementosLimpiezaProps {
  onCrear?: () => void;
  onCrearTipo?: () => void;
  onModificar?: (elemento: ElementoLimpieza) => void;
  onEliminar?: (elemento: ElementoLimpieza) => void;
  onVer?: (elemento: ElementoLimpieza) => void;
  onDarAlta?: (elemento: ElementoLimpieza) => void;
  onRegistrarRecambio?: (elemento: ElementoLimpieza) => void;
}

// Textos para columnas sin dato. "Sin calcular" coincide con <ProximoRecambio>.
const SIN_ESTABLECER = "Sin establecer";
const SIN_CALCULAR = "Sin calcular";

// Recambios llama "al_dia" a lo que el semáforo compartido llama "vigente".
const ESTADO_RECAMBIO: Record<EstadoRecambio, EstadoSemaforo> = {
  vencido: "vencido",
  proximo: "proximo",
  al_dia: "vigente",
};

type FiltrosElemento = {
  estado: string;
  sectorId: string;
  equipoId: string;
};

const FILTROS_INICIALES: FiltrosElemento = {
  estado: "activos",
  sectorId: "",
  equipoId: "",
};

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
  if (filtros.sectorId) params.set("sector_id", filtros.sectorId);
  if (filtros.equipoId) params.set("equipo_id", filtros.equipoId);
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

  // Búsqueda: se escribe en borrador y se aplica con Enter o "Filtrar".
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

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

  // Catálogos para los filtros. Se traen todos, incluso los inactivos, para
  // poder filtrar elementos que hayan quedado en un sector o equipo dado de baja.
  const { data: sectores } = useListadoData<Sector>({
    endpoint: `${BASE_URL}/sectores/`,
    pageSize: ITEMS_SELECT,
    errorMessage: "No se pudieron cargar los sectores.",
  });
  const { data: equipos } = useListadoData<Equipo>({
    endpoint: `${BASE_URL}/equipos/`,
    pageSize: ITEMS_SELECT,
    errorMessage: "No se pudieron cargar los equipos.",
  });

  const opcionesSectores = sectores.map((sector) => ({
    label: sector.nombre,
    value: String(sector.id),
  }));
  const opcionesEquipos = equipos.map((equipo) => ({
    label: equipo.nombre,
    value: String(equipo.id),
  }));

  const hayFiltros =
    busqueda.trim() !== "" ||
    borrador.estado !== FILTROS_INICIALES.estado ||
    borrador.sectorId !== "" ||
    borrador.equipoId !== "";
  const hayAplicados =
    busquedaAplicada !== "" ||
    aplicados.estado !== FILTROS_INICIALES.estado ||
    aplicados.sectorId !== "" ||
    aplicados.equipoId !== "";

  const aplicar = () => {
    setBusquedaAplicada(busqueda.trim());
    setAplicados(borrador);
    setPage(1);
  };

  const limpiar = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setPage(1);
  };

  const filtrosExportacion = armarFiltros([
    ["Búsqueda", busquedaAplicada],
    ["Estado", etiquetaOpcion(OPCIONES_ESTADO, aplicados.estado)],
    [
      "Sector",
      aplicados.sectorId &&
        (sectores.find((x) => String(x.id) === aplicados.sectorId)?.nombre ?? aplicados.sectorId),
    ],
    [
      "Equipo",
      aplicados.equipoId &&
        (equipos.find((x) => String(x.id) === aplicados.equipoId)?.nombre ?? aplicados.equipoId),
    ],
  ]);

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
      valorExportacion: (e) =>
        e.sector
          ? `Sector: ${e.sector.nombre}`
          : e.equipo
            ? `Equipo: ${e.equipo.nombre}`
            : "Sin asignar",
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
      valorExportacion: (e) =>
        e.frecuencia_recambio_dias ? `${e.frecuencia_recambio_dias} días` : SIN_ESTABLECER,
      render: (e) =>
        e.frecuencia_recambio_dias ? (
          `${e.frecuencia_recambio_dias} días`
        ) : (
          <span style={{ color: "gray" }}>{SIN_ESTABLECER}</span>
        ),
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
      valorExportacion: (e) => {
        const alerta = alertaPorElemento.get(e.id);
        return alerta
          ? textoSemaforo(
              fechaDDMMAAAA(alerta.proxima_fecha),
              ESTADO_RECAMBIO[alerta.estado],
              alerta.dias_restantes,
            )
          : SIN_CALCULAR;
      },
      render: (e) => <ProximoRecambio alerta={alertaPorElemento.get(e.id)} />,
    },
    {
      key: "activo",
      label: "Estado",
      w: "100px",
      valorExportacion: (e) => (e.activo ? "Activo" : "Inactivo"),
      render: (e) => (
        <Badge colorPalette={e.activo ? "green" : "red"}>
          {e.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
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
    <ListadoContainer>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Estado del elemento'
            placeholder='Estado'
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) =>
              setBorrador((actual) => ({ ...actual, estado: valor }))
            }
          />
          <FiltroSelect
            ariaLabel='Sector del elemento'
            placeholder='Todos los sectores'
            options={opcionesSectores}
            value={borrador.sectorId}
            onChange={(valor) =>
              setBorrador((actual) => ({
                ...actual,
                sectorId: valor,
                equipoId: valor ? "" : actual.equipoId,
              }))
            }
          />
          <FiltroSelect
            ariaLabel='Equipo del elemento'
            placeholder='Todos los equipos'
            options={opcionesEquipos}
            value={borrador.equipoId}
            onChange={(valor) =>
              setBorrador((actual) => ({
                ...actual,
                equipoId: valor,
                sectorId: valor ? "" : actual.sectorId,
              }))
            }
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
            exportarItems={data}
            exportarTitulo="Elementos de limpieza"
            exportarFiltros={filtrosExportacion}
            columns={columnas}
            getRowKey={(e) => e.id}
            minW='1210px'
          />

          <SemaforoLegend />

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