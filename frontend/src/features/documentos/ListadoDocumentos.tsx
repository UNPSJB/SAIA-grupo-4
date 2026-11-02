import { useState } from "react";
import { Badge, Box } from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";

import {
  AlertMessage,
  DataTable,
  FiltroSelect,
  FiltrosBar,
  FiltroTexto,
  LoadingState,
  SemaforoLegend,
  TablePagination,
} from "../../components/ui";
import type { ColumnDef } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { BASE_URL } from "../../config";
import {
  TIPOS_DOCUMENTO,
  TIPOS_DOCUMENTO_LABELS,
  type Documento,
} from "./types";
import { ProximaRevision } from "./ProximaRevision";
import { AccionesDocumento } from "./AccionesDocumento";

interface ListadoDocumentosProps {
  onCrear?: () => void;
  onModificar?: (doc: Documento) => void;
  onEliminar?: (doc: Documento) => void;
  onDarAlta?: (doc: Documento) => void;
  onVer?: (doc: Documento) => void;
  onSubirVersion?: (doc: Documento) => void;
  onRegistrarRevision?: (doc: Documento) => void;
  onVerHistorial?: (doc: Documento) => void;
}

const ITEMS_POR_PAGINA = 5;

const OPCIONES_TIPO = TIPOS_DOCUMENTO.map((value) => ({
  label: TIPOS_DOCUMENTO_LABELS[value],
  value,
}));

const OPCIONES_ESTADO = [
  { label: "Activos", value: "activos" },
  { label: "Inactivos", value: "inactivos" },
];

type FiltrosDocumento = {
  tipoDocumento: string;
  estado: string;
};

const FILTROS_INICIALES: FiltrosDocumento = {
  tipoDocumento: "",
  estado: "",
};

// Arma el endpoint del listado: solo se mandan los filtros que tienen valor.
const construirEndpoint = (filtros: FiltrosDocumento, busqueda: string) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (filtros.tipoDocumento) {
    params.set("tipo_documento", filtros.tipoDocumento);
  }
  if (filtros.estado === "activos") params.set("activo", "true");
  if (filtros.estado === "inactivos") params.set("activo", "false");

  const query = params.toString();
  return `${BASE_URL}/documentos/${query ? `?${query}` : ""}`;
};

export const ListadoDocumentos = ({
  onCrear,
  onModificar,
  onEliminar,
  onDarAlta,
  onVer,
  onSubirVersion,
  onRegistrarRevision,
  onVerHistorial,
}: ListadoDocumentosProps) => {
  // Búsqueda: se escribe en borrador y se aplica con Enter o "Filtrar".
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const [borrador, setBorrador] =
    useState<FiltrosDocumento>(FILTROS_INICIALES);
  const [aplicados, setAplicados] =
    useState<FiltrosDocumento>(FILTROS_INICIALES);

  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Documento>({
      endpoint: construirEndpoint(aplicados, busquedaAplicada),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de documentos.",
    });

  const hayFiltros =
    busqueda.trim() !== "" ||
    borrador.tipoDocumento !== "" ||
    borrador.estado !== FILTROS_INICIALES.estado;
  const hayAplicados =
    busquedaAplicada !== "" ||
    aplicados.tipoDocumento !== "" ||
    aplicados.estado !== FILTROS_INICIALES.estado;

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

  const columnas: ColumnDef<Documento>[] = [
    {
      key: "codigo",
      label: "Código",
      w: "110px",
      truncate: true,
      render: (doc) => doc.codigo || "—",
    },
    {
      key: "titulo",
      label: "Título",
      w: "240px",
      truncate: true,
      render: (doc) => doc.titulo,
    },
    {
      key: "tipo_documento",
      label: "Tipo",
      w: "150px",
      render: (doc) => (
        <Badge colorPalette="blue" variant="subtle">
          {TIPOS_DOCUMENTO_LABELS[doc.tipo_documento]}
        </Badge>
      ),
    },
    {
      key: "version_vigente",
      label: "Versión",
      w: "140px",
      render: (doc) =>
        doc.version_vigente ? (
          <Badge colorPalette="green">{doc.version_vigente.version}</Badge>
        ) : (
          <span style={{ color: "var(--chakra-colors-gray-400)" }}>
            No tiene versión
          </span>
        ),
    },
    {
      key: "proxima_revision",
      label: "Próxima Revisión",
      w: "170px",
      // Documento inactivo → "—" (mismo criterio que ProximoRecambio en
      // elementos de limpieza, que no muestra alerta si está dado de baja)
      render: (doc) => (
        <ProximaRevision
          fecha={
            doc.activo ? doc.version_vigente?.fecha_proxima_revision : null
          }
        />
      ),
    },
    {
      key: "activo",
      label: "Estado",
      w: "100px",
      render: (doc) => (
        <Badge colorPalette={doc.activo ? "green" : "red"}>
          {doc.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      w: "260px",
      align: "end",
      render: (doc) => (
        <AccionesDocumento
          documento={doc}
          onVer={onVer}
          onModificar={onModificar}
          onEliminar={onEliminar}
          onDarAlta={onDarAlta}
          onSubirVersion={onSubirVersion}
          onRegistrarRevision={onRegistrarRevision}
          onVerHistorial={onVerHistorial}
        />
      ),
    },
  ];

  return (
    <ListadoContainer>
      <ListadoHeader
        title="Gestión Documental"
        icon={FiFileText}
        buttonLabel="Nuevo documento"
        onCrear={onCrear}
      />

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel="Buscar documento"
            placeholder="Código, título o descripción"
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel="Tipo de documento"
            placeholder="Todos los tipos"
            options={OPCIONES_TIPO}
            value={borrador.tipoDocumento}
            onChange={(valor) =>
              setBorrador((actual) => ({
                ...actual,
                tipoDocumento: valor,
              }))
            }
          />
          <FiltroSelect
            ariaLabel="Estado del documento"
            placeholder="Todos los estados"
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) =>
              setBorrador((actual) => ({ ...actual, estado: valor }))
            }
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message="Cargando documentos..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type="info"
          message={
            hayAplicados
              ? "No hay documentos que coincidan con los filtros seleccionados."
              : "Todavía no hay documentos cargados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(doc) => doc.id}
            minW="1150px"
          />

          <SemaforoLegend />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular="documento"
            labelPlural="documentos"
          />
        </>
      )}
    </ListadoContainer>
  );
};
