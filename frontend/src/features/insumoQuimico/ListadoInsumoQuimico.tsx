import { BASE_URL, ITEMS_POR_PAGINA, ITEMS_SELECT } from "../../config";
import { useState } from "react";
import { Badge, Box, HStack, Button } from "@chakra-ui/react";
import {
  FiEdit2,
  FiEye,
  FiTrash2,
  FiCheckCircle,
  FiDroplet,
  FiPlus,
} from "react-icons/fi";
import { FaRuler } from "react-icons/fa";
import {
  AlertMessage,
  DataTable,
  FiltrosBar,
  FiltroSelect,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { InsumoQuimico } from "./types";
import type { Sector } from "../sectores/types";
import type { Equipo } from "../equipos/types";
import type { ColumnDef } from "../../components/ui";
import { armarFiltros, etiquetaOpcion } from "../../utils/exportacion";

interface ListadoInsumosQuimicosProps {
  onCrear?: () => void;
  onModificar?: (insumoQuimico: InsumoQuimico) => void;
  onEliminar?: (insumoQuimico: InsumoQuimico) => void;
  onVer?: (insumoQuimico: InsumoQuimico) => void;
  onDarAlta?: (insumoQuimico: InsumoQuimico) => void;
  onVerUnidades?: () => void;
}

// Arma el endpoint del listado: solo se manda cada filtro si tiene valor.
const construirEndpoint = (
  busqueda: string,
  estado: string,
  sectorId: string,
  equipoId: string,
) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (estado === "activo") params.set("activo", "true");
  if (estado === "inactivo") params.set("activo", "false");
  if (sectorId) params.set("sector_id", sectorId);
  if (equipoId) params.set("equipo_id", equipoId);

  const query = params.toString();
  return `${BASE_URL}/insumos-quimicos/${query ? `?${query}` : ""}`;
};

const OPCIONES_ESTADO = [
  { label: "Activos", value: "activo" },
  { label: "Inactivos", value: "inactivo" },
];

type FiltrosInsumoQuimico = {
  estado: string;
  sectorId: string;
  equipoId: string;
};

const FILTROS_INICIALES: FiltrosInsumoQuimico = {
  estado: "",
  sectorId: "",
  equipoId: "",
};

const formatearConsumo = (consumo: number) =>
  Number(consumo).toLocaleString("es-AR", {
    maximumFractionDigits: 3,
  });

export const ListadoInsumosQuimicos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
}: ListadoInsumosQuimicosProps) => {
  // Búsqueda: se escribe en borrador y se aplica con Enter o "Filtrar".
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const [borrador, setBorrador] =
    useState<FiltrosInsumoQuimico>(FILTROS_INICIALES);
  const [aplicados, setAplicados] =
    useState<FiltrosInsumoQuimico>(FILTROS_INICIALES);

  const hayFiltros =
    busqueda.trim() !== "" ||
    borrador.estado !== "" ||
    borrador.sectorId !== "" ||
    borrador.equipoId !== "";

  const hayAplicados =
    busquedaAplicada !== "" ||
    aplicados.estado !== "" ||
    aplicados.sectorId !== "" ||
    aplicados.equipoId !== "";

  // Catálogos para los desplegables. Solo se ofrecen asociaciones activas.
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

  const opcionesSectores = sectores
    .filter((sector) => sector.activo)
    .map((sector) => ({ label: sector.nombre, value: String(sector.id) }));
  const opcionesEquipos = equipos
    .filter((equipo) => equipo.activo)
    .map((equipo) => ({ label: equipo.nombre, value: String(equipo.id) }));

  // La página vuelve a 1 sola cuando cambia el endpoint (lo resuelve el hook)
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<InsumoQuimico>({
      endpoint: construirEndpoint(
        busquedaAplicada,
        aplicados.estado,
        aplicados.sectorId,
        aplicados.equipoId,
      ),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de insumos químicos.",
    });

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

  const columnas: ColumnDef<InsumoQuimico>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (insumoQuimico) => insumoQuimico.nombre,
    },
    {
      key: "asociacion",
      label: "Asociado a",
      valorExportacion: (insumoQuimico) =>
        insumoQuimico.equipo
          ? `Equipo: ${insumoQuimico.equipo.nombre}`
          : insumoQuimico.sector
            ? `Sector: ${insumoQuimico.sector.nombre}`
            : "Sin asignar",
      render: (insumoQuimico) => {
        if (insumoQuimico.equipo) {
          return (
            <Badge colorPalette='purple' variant='subtle'>
              Equipo: {insumoQuimico.equipo.nombre}
            </Badge>
          );
        }
        if (insumoQuimico.sector) {
          return (
            <Badge colorPalette='blue' variant='subtle'>
              Sector: {insumoQuimico.sector.nombre}
            </Badge>
          );
        }
        return "Sin asignar";
      },
    },
    {
      key: "unidad_medida",
      label: "Consumo",
      render: (insumoQuimico) =>
        `${formatearConsumo(insumoQuimico.consumo)} ${insumoQuimico.unidad_medida.simbolo}`,
    },
    {
      key: "activo",
      label: "Estado",
      valorExportacion: (insumoQuimico) => (insumoQuimico.activo ? "Activo" : "Inactivo"),
      render: (insumoQuimico) => (
        <Badge colorPalette={insumoQuimico.activo ? "green" : "red"}>
          {insumoQuimico.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
      align: "end",
      render: (insumoQuimico) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(insumoQuimico)}
            visible={insumoQuimico.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(insumoQuimico)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(insumoQuimico)}
            visible={insumoQuimico.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(insumoQuimico)}
            visible={!insumoQuimico.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title='Insumos Químicos' icon={FiDroplet} />
        <HStack gap={2}>
          <Button
            variant='outline'
            colorPalette='green'
            onClick={onVerUnidades}
          >
            <FaRuler /> Unidades de medida
          </Button>
          <Button colorPalette='green' onClick={onCrear}>
            <FiPlus /> Nuevo insumo químico
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
            ariaLabel='Buscar insumo químico'
            placeholder='Nombre, sector o equipo'
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Estado del insumo químico'
            placeholder='Todos los estados'
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) =>
              setBorrador((actual) => ({ ...actual, estado: valor }))
            }
          />
          <FiltroSelect
            ariaLabel='Sector del insumo químico'
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
            ariaLabel='Equipo del insumo químico'
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

      {loading && <LoadingState message='Cargando insumos químicos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            hayAplicados
              ? "No hay insumos químicos que coincidan con los filtros."
              : "Todavía no hay insumos químicos cargados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            exportItems={data}
            exportTitle="Insumos químicos"
            exportFilters={filtrosExportacion}
            columns={columnas}
            getRowKey={(insumoQuimico) => insumoQuimico.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='insumo químico'
            labelPlural='insumos químicos'
          />
        </>
      )}
    </ListadoContainer>
  );
};