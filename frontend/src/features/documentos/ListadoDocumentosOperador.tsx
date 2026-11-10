import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";

import {
  AlertMessage,
  DataTable,
  FiltroSelect,
  FiltroTexto,
  FiltrosBar,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import type { ColumnDef } from "../../components/ui";
import { armarFiltros, etiquetaOpcion } from "../../utils/exportacion";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { BASE_URL } from "../../config";
import type { Documento } from "./types";
import { TIPOS_DOCUMENTO, TIPOS_DOCUMENTO_LABELS } from "./types";

const ENDPOINT = `${BASE_URL}/documentos/activos`;
const ITEMS_POR_PAGINA = 8;

const formatearTipo = (tipo: string) => tipo.replace(/_/g, " ");

const OPCIONES_TIPO = TIPOS_DOCUMENTO.map((value) => ({
  label: TIPOS_DOCUMENTO_LABELS[value],
  value,
}));

/**
 * Listado de documentos para el operador: sólo lectura.
 *
 * Muestra únicamente los documentos activos que tienen una versión vigente, con
 * código, título y tipo, y la acción de abrir el visor de PDF. En escritorio se
 * ve como tabla y en móvil como tarjetas apiladas.
 */
export const ListadoDocumentosOperador = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useListadoData<Documento>({
    endpoint: ENDPOINT,
    errorMessage: "No se pudieron cargar los documentos.",
  });

  const [page, setPage] = useState(1);

  // Filtros: borrador (lo que escribe el usuario) y aplicados (lo que filtra la vista)
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [tipoBorrador, setTipoBorrador] = useState("");
  const [tipoAplicado, setTipoAplicado] = useState("");

  // Sólo documentos con versión vigente (el backend ya devuelve sólo activos).
  const vigentes = useMemo(
    () => data.filter((doc) => !!doc.version_vigente),
    [data],
  );

  // Filtrado local por texto y tipo
  const filtrados = useMemo(() => {
    const termino = busquedaAplicada.trim().toLowerCase();
    return vigentes.filter((doc) => {
      if (tipoAplicado && doc.tipo_documento !== tipoAplicado) return false;
      if (termino) {
        const codigo = (doc.codigo || "").toLowerCase();
        const titulo = doc.titulo.toLowerCase();
        if (!codigo.includes(termino) && !titulo.includes(termino)) return false;
      }
      return true;
    });
  }, [vigentes, busquedaAplicada, tipoAplicado]);

  const itemsPagina = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [filtrados, page]);

  const verDocumento = (doc: Documento) => {
    const vigente = doc.version_vigente;
    if (!vigente) return;
    navigate(`/documentos/${doc.id}/versiones/${vigente.id}/pdf`);
  };

  const hayFiltros =
    busqueda.trim() !== "" || tipoBorrador !== "";

  const aplicar = () => {
    setBusquedaAplicada(busqueda.trim());
    setTipoAplicado(tipoBorrador);
    setPage(1);
  };

  const limpiar = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setTipoBorrador("");
    setTipoAplicado("");
    setPage(1);
  };

  const filtrosExportacion = armarFiltros([
    ["Búsqueda", busquedaAplicada],
    ["Tipo", etiquetaOpcion(OPCIONES_TIPO, tipoAplicado)],
  ]);

  const columnas: ColumnDef<Documento>[] = [
    {
      key: "codigo",
      label: "Código",
      w: "150px",
      render: (doc) => doc.codigo || "—",
    },
    {
      key: "titulo",
      label: "Título",
      render: (doc) => doc.titulo,
    },
    {
      key: "tipo_documento",
      label: "Tipo",
      w: "180px",
      valorExportacion: (doc) =>
        etiquetaOpcion(OPCIONES_TIPO, doc.tipo_documento) ?? formatearTipo(doc.tipo_documento),
      render: (doc) => (
        <Badge colorPalette="blue" variant="subtle">
          {formatearTipo(doc.tipo_documento)}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
      w: "110px",
      align: "end",
      render: (doc) => (
        <RowActions>
          <RowActionButton
            icon={FiFileText}
            label="Ver documento"
            title="Ver el documento"
            colorPalette="orange"
            onClick={() => verDocumento(doc)}
            visible={!!doc.version_vigente}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer mt={8}>
      <ListadoHeader title="Documentos" icon={FiFileText} />

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel="Buscar documento"
            placeholder="Código o título"
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
            value={tipoBorrador}
            onChange={setTipoBorrador}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message="Cargando documentos..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && vigentes.length === 0 && (
        <AlertMessage
          type="info"
          message="Todavía no hay documentos con versión vigente."
        />
      )}

      {!loading && !error && vigentes.length > 0 && filtrados.length === 0 && (
        <AlertMessage
          type="info"
          message="No hay documentos que coincidan con los filtros."
        />
      )}

      {!loading && !error && filtrados.length > 0 && (
        <>
          {/* Tabla: tablet y escritorio */}
          <Box>
            <DataTable
              items={itemsPagina}
              exportItems={filtrados}
              exportTitle="Documentos"
              exportFilters={filtrosExportacion}
              hideTableOnMobile
              columns={columnas}
              getRowKey={(doc) => doc.id}
            />
          </Box>

          {/* Tarjetas: móvil */}
          <VStack
            display={{ base: "flex", md: "none" }}
            align="stretch"
            gap={3}
          >
            {itemsPagina.map((doc) => (
              <Card.Root key={doc.id} variant="outline">
                <Card.Body gap={2}>
                  <HStack justify="space-between" align="flex-start" gap={2}>
                    <Text fontWeight="bold" color="green.700" truncate>
                      {doc.codigo || "Sin código"}
                    </Text>
                    <Badge colorPalette="blue" variant="subtle" flexShrink={0}>
                      {formatearTipo(doc.tipo_documento)}
                    </Badge>
                  </HStack>
                  <Text fontWeight="medium">{doc.titulo}</Text>
                  <Button
                    mt={1}
                    colorPalette="orange"
                    variant="outline"
                    w="100%"
                    onClick={() => verDocumento(doc)}
                  >
                    <FiFileText /> Ver documento
                  </Button>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>

          <Box mt={4}>
            <TablePagination
              count={filtrados.length}
              page={page}
              pageSize={ITEMS_POR_PAGINA}
              onPageChange={setPage}
              labelSingular="documento"
              labelPlural="documentos"
            />
          </Box>
        </>
      )}
    </ListadoContainer>
  );
};