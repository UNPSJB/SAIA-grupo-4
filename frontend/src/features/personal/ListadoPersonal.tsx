import { useState } from "react";
import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import {
  Badge,
  Box,
  Wrap,
  HStack,
  Button,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiUser,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiAward,
  FiPlus,
  FiFileText,
  FiCalendar,
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
  SemaforoFecha,
  SemaforoLegend,
  TablePagination,
  textoSemaforo,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { calcularSemaforo } from "../../utils/semaforo";
import { formatearFecha } from "../../utils/fecha";
import { armarFiltros, etiquetaOpcion } from "../../utils/exportacion";
import type { Persona } from "./types";
import type { ColumnDef } from "../../components/ui";
import type { DocumentoPersonal } from "../documentosPersonal/types";

type FiltrosPersonal = {
  documentoId: string;
  estado: string;
};

const FILTROS_INICIALES: FiltrosPersonal = { documentoId: "", estado: "" };

const OPCIONES_ESTADO = [
  { label: "Con vencidos", value: "vencido" },
  { label: "Con próximos a vencer", value: "proximo" },
  { label: "Con vigentes", value: "vigente" },
];

// Vencimientos ordenados del más urgente al menos urgente.
const vencimientosOrdenados = (p: Persona) =>
  [...(p.vencimientos || [])].sort(
    (a, b) =>
      a.fecha_vencimiento.localeCompare(b.fecha_vencimiento) ||
      a.documento.nombre.localeCompare(b.documento.nombre, "es"),
  );

// "Libreta sanitaria: 20/11/2026 - Próximo a vencer (en 11 días) (+2 documentos)"
const textoVencimientoUrgente = (p: Persona) => {
  const vencimientos = vencimientosOrdenados(p);
  const urgente = vencimientos[0];
  if (!urgente) return "Ninguno";
  const calculado = calcularSemaforo(urgente.fecha_vencimiento);
  const restantes = vencimientos.length - 1;
  const semaforo = textoSemaforo(
    formatearFecha(urgente.fecha_vencimiento),
    urgente.estado ?? calculado.estado,
    urgente.dias_restantes ?? calculado.diasRestantes,
  );
  const extra =
    restantes > 0 ? ` (+${restantes} ${restantes === 1 ? "documento" : "documentos"})` : "";
  return `${urgente.documento.nombre}: ${semaforo}${extra}`;
};

// Arma el endpoint del listado: solo se mandan los filtros que tienen valor.
const construirEndpoint = (filtros: FiltrosPersonal, busqueda: string) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (filtros.documentoId) params.set("documento_id", filtros.documentoId);
  if (filtros.estado) params.set("estado", filtros.estado);

  const query = params.toString();
  return `${BASE_URL}/personal/${query ? `?${query}` : ""}`;
};

interface ListadoPersonalProps {
  onCrear?: () => void;
  onModificar?: (persona: Persona) => void;
  onEliminar?: (persona: Persona) => void;
  onVer?: (persona: Persona) => void;
  onDarAlta?: (persona: Persona) => void;
  onVerCapacidades?: () => void;
  onVerDocumentos?: () => void;
  onRegistrarVencimiento?: (persona: Persona) => void;
}

export const ListadoPersonal = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerCapacidades,
  onVerDocumentos,
  onRegistrarVencimiento,
}: ListadoPersonalProps) => {
  // Borrador: lo que el usuario está por aplicar. Aplicados: lo único que llega al endpoint.
  const [borrador, setBorrador] = useState<FiltrosPersonal>(FILTROS_INICIALES);
  const [aplicados, setAplicados] =
    useState<FiltrosPersonal>(FILTROS_INICIALES);

  // Búsqueda: se escribe en borrador y se aplica con Enter o "Filtrar".
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Persona>({
      endpoint: construirEndpoint(aplicados, busquedaAplicada),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de personal.",
    });

  // Tipos de documento para el filtro por tipo de vencimiento
  const { data: documentos } = useListadoData<DocumentoPersonal>({
    endpoint: `${BASE_URL}/documentos-personal/`,
    errorMessage: "No se pudieron cargar los documentos.",
  });

  const hayFiltros =
    busqueda.trim() !== "" || borrador.documentoId !== "" || borrador.estado !== "";
  const hayAplicados =
    busquedaAplicada !== "" ||
    aplicados.documentoId !== "" ||
    aplicados.estado !== "";

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
    [
      "Documento",
      aplicados.documentoId &&
        (documentos.find((d) => String(d.id) === aplicados.documentoId)?.nombre ??
          aplicados.documentoId),
    ],
    ["Vencimientos", etiquetaOpcion(OPCIONES_ESTADO, aplicados.estado)],
  ]);

  const columnas: ColumnDef<Persona>[] = [
    { key: "legajo", label: "Legajo", render: (p) => p.legajo },
    {
      key: "nombre",
      label: "Nombre completo",
      render: (p) => `${p.nombre} ${p.apellido}`,
    },
    { key: "dni", label: "DNI", render: (p) => p.dni },
    {
      key: "capacidades",
      label: "Capacidades",
      valorExportacion: (p) => {
        const activas = (p.capacidades || []).filter((c) => c.activo);
        return activas.length
          ? activas.map((c) => c.capacidad.nombre).join(", ")
          : "Ninguna";
      },
      render: (p) => {
        const activas = (p.capacidades || []).filter((c) => c.activo);
        if (activas.length === 0)
          return <span style={{ color: "gray" }}>Ninguna</span>;
        return (
          <Wrap gap={1}>
            {activas.map((c) => (
              <Badge
                key={c.id}
                colorPalette={
                  c.capacidad.tipo === "sistema" ? "blue" : "yellow"
                }
                variant='subtle'
                textTransform='capitalize'
              >
                {c.capacidad.nombre}
              </Badge>
            ))}
          </Wrap>
        );
      },
    },
    {
      key: "vencimientos",
      label: "Vencimiento más urgente",
      w: "280px",
      valorExportacion: textoVencimientoUrgente,
      render: (p) => {
        const vencimientos = vencimientosOrdenados(p);
        const urgente = vencimientos[0];
        if (!urgente) return <span style={{ color: "gray" }}>Ninguno</span>;

        const calculado = calcularSemaforo(urgente.fecha_vencimiento);
        const restantes = vencimientos.length - 1;

        return (
          <VStack align='start' gap={0}>
            <Text fontSize='sm' fontWeight='medium'>
              {urgente.documento.nombre}
            </Text>
            <SemaforoFecha
              estado={urgente.estado ?? calculado.estado}
              fecha={urgente.fecha_vencimiento}
              diasRestantes={urgente.dias_restantes ?? calculado.diasRestantes}
            />
            {restantes > 0 && (
              <Badge
                mt={1}
                variant='subtle'
                colorPalette='gray'
                textTransform='none'
              >
                +{restantes} {restantes === 1 ? "documento" : "documentos"}
              </Badge>
            )}
          </VStack>
        );
      },
    },
    {
      key: "activo",
      label: "Estado",
      valorExportacion: (p) => (p.activo ? "Activo" : "Inactivo"),
      render: (p) => (
        <Badge colorPalette={p.activo ? "green" : "red"}>
          {p.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      exportable: false,
      render: (p) => (
        <RowActions>
          <RowActionButton
            icon={FiCalendar}
            label='Registrar vencimiento'
            colorPalette='purple'
            onClick={() => onRegistrarVencimiento?.(p)}
            visible={p.activo}
          />
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(p)}
            visible={p.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(p)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(p)}
            visible={p.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(p)}
            visible={!p.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title='Personal' icon={FiUser} />
        <HStack gap={2}>
          <Button
            variant='outline'
            colorPalette='green'
            onClick={onVerCapacidades}
          >
            <FiAward /> Capacidades
          </Button>
          <Button
            variant='outline'
            colorPalette='green'
            onClick={onVerDocumentos}
          >
            <FiFileText /> Documentos
          </Button>
          <Button colorPalette='green' onClick={onCrear}>
            <FiPlus /> Nueva persona
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
            ariaLabel='Buscar persona'
            placeholder='Nombre, apellido o DNI'
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Tipo de vencimiento'
            placeholder='Todos los documentos'
            options={documentos
              .filter((d) => d.activo)
              .map((d) => ({ label: d.nombre, value: String(d.id) }))}
            value={borrador.documentoId}
            onChange={(valor) =>
              setBorrador({ ...borrador, documentoId: valor })
            }
          />
          <FiltroSelect
            ariaLabel='Estado de los vencimientos'
            placeholder='Todos los estados'
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) => setBorrador({ ...borrador, estado: valor })}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando personal...' />}
      {!loading && error && <AlertMessage type='error' message={error} />}
      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            hayAplicados
              ? "No hay personal que coincida con la búsqueda o los filtros seleccionados."
              : "Todavía no hay personal cargado."
          }
        />
      )}
      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            exportItems={data}
            exportTitle="Personal"
            exportFilters={filtrosExportacion}
            columns={columnas}
            getRowKey={(p) => p.id}
            minW='1100px'
          />
          <SemaforoLegend />
          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='persona'
            labelPlural='personas'
          />
        </>
      )}
    </ListadoContainer>
  );
};
