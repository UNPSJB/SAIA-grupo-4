import { useState } from "react";
import { Badge, Box } from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";

import {
  AlertMessage,
  DataTable,
  FiltrosBar,
  FiltroTexto,
  LoadingState,
  TablePagination,
} from "../../components/ui";
import type { ColumnDef } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { useDebounce } from "../../hooks/useDebounce";
import { BASE_URL } from "../../config";
import type { Documento } from "./types";
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

// Arma el endpoint del listado: solo se manda la búsqueda si tiene valor.
const construirEndpoint = (busqueda: string) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);

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
  // Texto del input (inmediato) y texto que realmente viaja al backend (con debounce)
  const [busqueda, setBusqueda] = useState("");
  const busquedaAplicada = useDebounce(busqueda.trim(), 300);

  // La página vuelve a 1 sola cuando cambia el endpoint (lo resuelve el hook)
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Documento>({
      endpoint: construirEndpoint(busquedaAplicada),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de documentos.",
    });

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
          {doc.tipo_documento.replace("_", " ")}
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
    <ListadoContainer maxW="6xl">
      <ListadoHeader
        title="Gestión Documental"
        icon={FiFileText}
        buttonLabel="Nuevo documento"
        onCrear={onCrear}
      />

      <Box mb={4}>
        <FiltrosBar
          ocultarAplicar
          onAplicar={() => {}} // la búsqueda se aplica sola mientras se escribe
          onLimpiar={() => setBusqueda("")}
          hayFiltrosActivos={busqueda !== ""}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel="Buscar documento"
            placeholder="Código, título, tipo o versión"
            value={busqueda}
            onChange={setBusqueda}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message="Cargando documentos..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type="info"
          message={
            busquedaAplicada
              ? "No hay documentos que coincidan con la búsqueda."
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