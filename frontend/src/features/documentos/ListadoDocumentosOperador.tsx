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
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import type { ColumnDef } from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Documento } from "./types";

// Endpoint que devuelve los documentos activos junto con su versión vigente.
const ENDPOINT = "http://127.0.0.1:8000/documentos/activos";
const ITEMS_POR_PAGINA = 8;

const formatearTipo = (tipo: string) => tipo.replace(/_/g, " ");

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

  // Sólo documentos con versión vigente (el backend ya devuelve sólo activos).
  const vigentes = useMemo(
    () => data.filter((doc) => !!doc.version_vigente),
    [data],
  );

  const itemsPagina = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return vigentes.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [vigentes, page]);

  const verDocumento = (doc: Documento) => {
    const vigente = doc.version_vigente;
    if (!vigente) return;
    navigate(`/documentos/${doc.id}/versiones/${vigente.id}/pdf`);
  };

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
      render: (doc) => (
        <Badge colorPalette="blue" variant="subtle">
          {formatearTipo(doc.tipo_documento)}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
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
    <ListadoContainer maxW="5xl" mt={8}>
      <ListadoHeader title="Documentos" icon={FiFileText} />

      {loading && <LoadingState message="Cargando documentos..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && vigentes.length === 0 && (
        <AlertMessage
          type="info"
          message="Todavía no hay documentos con versión vigente."
        />
      )}

      {!loading && !error && vigentes.length > 0 && (
        <>
          {/* Tabla: tablet y escritorio */}
          <Box display={{ base: "none", md: "block" }}>
            <DataTable
              items={itemsPagina}
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
              count={vigentes.length}
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
