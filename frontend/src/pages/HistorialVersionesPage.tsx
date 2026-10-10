import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Heading, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
} from "react-icons/fi";

import {
  AlertConfirm,
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../components/ui";
import {
  DetalleModal,
  ListadoContainer,
  type SeccionDetalle,
} from "../components/layout";
import { useDocumentoDetalle } from "../features/documentos/hooks/useDocumentoDetalle";
import { useDocumentoVersiones } from "../features/documentos/hooks/useDocumentoVersiones";
import { formatearFecha, formatearFechaHora } from "../features/documentos/utils";
import type { RevisionDocumento, VersionDocumento } from "../features/documentos/types";

const ITEMS_POR_PAGINA = 5;

const API_BASE = "http://127.0.0.1:8000/documentos";


 // Historial de versiones de UN documento. Arriba se muestran los datos de la cabecera del documento y cada fila es una versión
 // con su estado, período de vigencia y acciones (ver PDF, activar una histórica y ver el historial de revisiones).

export default function HistorialVersionesPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const documentoId = Number(params.id);

  const { documento, versiones, loading, error, reload } = useDocumentoDetalle({
    documentoId,
    errorMessage: "No se pudo cargar el historial de versiones.",
  });
  const { activarVersion, isSubmitting: activando } = useDocumentoVersiones();

  const [page, setPage] = useState(1);

  // Modal de revisiones de una versión (carga bajo demanda al hacer clic)
  const [versionRevisiones, setVersionRevisiones] = useState<VersionDocumento | null>(null);
  const [revisiones, setRevisiones] = useState<RevisionDocumento[] | null>(null);
  const [cargandoRevisiones, setCargandoRevisiones] = useState(false);
  const [errorRevisiones, setErrorRevisiones] = useState("");

  // Confirmación de activar una versión histórica
  const [versionAActivar, setVersionAActivar] = useState<VersionDocumento | null>(null);
  const [errorActivar, setErrorActivar] = useState("");

  const verRevisiones = async (version: VersionDocumento) => {
    setVersionRevisiones(version);
    setRevisiones(null);
    setErrorRevisiones("");
    setCargandoRevisiones(true);
    try {
      const res = await fetch(`${API_BASE}/${documentoId}/versiones/${version.id}/revisiones`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setRevisiones((await res.json()) as RevisionDocumento[]);
    } catch {
      setErrorRevisiones("No se pudo cargar el historial de revisiones.");
    } finally {
      setCargandoRevisiones(false);
    }
  };

  const confirmarActivacion = async () => {
    if (!versionAActivar) return;
    setErrorActivar("");
    const res = await activarVersion(documentoId, versionAActivar.id);
    if (res.status === "error") {
      setErrorActivar(res.message);
      return;
    }
    setVersionAActivar(null);
    reload();
  };

  const columnas: ColumnDef<VersionDocumento>[] = [
    {
      key: "version",
      label: "Versión",
      w: "90px",
      render: (v) => v.version,
    },
    {
      key: "estado",
      label: "Estado",
      w: "110px",
      render: (v) => (
        <Badge colorPalette={v.es_vigente ? "green" : "gray"}>
          {v.es_vigente ? "Vigente" : "Histórica"}
        </Badge>
      ),
    },
    {
      key: "vigencia",
      label: "Período de vigencia",
      w: "210px",
      render: (v) =>
        `${formatearFecha(v.fecha_desde)} – ${v.fecha_hasta ? formatearFecha(v.fecha_hasta) : "Actualidad"}`,
    },
    {
      key: "subido_por",
      label: "Subido por",
      w: "160px",
      truncate: true,
      render: (v) => v.subido_por_nombre || "—",
    },
    {
      key: "fecha_subida",
      label: "Fecha de subida",
      w: "130px",
      render: (v) => formatearFecha(v.fecha_subida),
    },
    {
      key: "observaciones",
      label: "Motivo / Observaciones",
      w: "240px",
      truncate: true,
      render: (v) => v.observaciones_cambio || "—",
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      w: "170px",
      render: (v) => (
        <RowActions>
          <RowActionButton
            icon={FiCheckCircle}
            label="Activar"
            title="Reactivar esta versión: la vigente pasará a histórica"
            colorPalette="green"
            onClick={() => {
              setErrorActivar("");
              setVersionAActivar(v);
            }}
            visible={!v.es_vigente}
          />
          <RowActionButton
            icon={FiFileText}
            label="Ver PDF"
            title="Ver el PDF de esta versión"
            colorPalette="orange"
            onClick={() => navigate(`/documentos/${documentoId}/versiones/${v.id}/pdf`)}
            visible={!!v.archivo_url}
          />
          <RowActionButton
            icon={FiCalendar}
            label="Revisiones"
            title="Ver el historial de revisiones de esta versión"
            colorPalette="teal"
            onClick={() => void verRevisiones(v)}
          />
        </RowActions>
      ),
    },
  ];

  // Secciones del modal de revisiones según el estado de la carga
  const seccionesRevisiones: SeccionDetalle[] = !versionRevisiones
    ? []
    : cargandoRevisiones
      ? [
          {
            titulo: "Cargando revisiones",
            icono: FiCalendar,
            items: [{ label: "", valor: <LoadingState message="Cargando revisiones..." /> }],
          },
        ]
      : errorRevisiones
        ? [
            {
              titulo: "Error",
              icono: FiCalendar,
              items: [{ label: "", valor: <AlertMessage type="error" message={errorRevisiones} /> }],
            },
          ]
        : revisiones && revisiones.length > 0
          ? revisiones.map((r) => ({
              titulo: `Revisión del ${formatearFechaHora(r.fecha_registro)}`,
              icono: FiCalendar,
              items: [
                {
                  label: "Nueva fecha de revisión",
                  valor: r.nueva_fecha_proxima_revision
                    ? formatearFecha(r.nueva_fecha_proxima_revision)
                    : "Sin cambios",
                },
                { label: "Observaciones", valor: r.observaciones || "—" },
                { label: "Registrado por", valor: r.registrado_por_nombre || "—" },
              ],
            }))
          : [
              {
                titulo: "Revisiones",
                icono: FiCalendar,
                items: [
                  {
                    label: "",
                    valor: "Esta versión todavía no tiene revisiones registradas.",
                  },
                ],
              },
            ];

  return (
    <ListadoContainer maxW="7xl">
      {/* Título + volver al listado */}
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={2} mb={6}>
        <Heading size="xl" color="green" display="flex" alignItems="center" gap={2}>
          <Icon as={FiClock} />
          Historial de Versiones
        </Heading>
        <Button variant="outline" colorPalette="green" onClick={() => navigate("/documentos")}>
          <FiArrowLeft /> Volver al listado
        </Button>
      </HStack>

      {loading && <LoadingState message="Cargando historial..." />}

      {!loading && error && (
        <VStack gap={4} align="stretch">
          <AlertMessage type="error" message={error} />
          <Button variant="outline" colorPalette="green" alignSelf="flex-start" onClick={() => navigate("/documentos")}>
            <FiArrowLeft /> Volver al listado
          </Button>
        </VStack>
      )}

      {!loading && !error && documento && (
        <>
          {/* Cabecera del documento del que se ve el historial */}
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            boxShadow="sm"
            p={5}
            mb={6}
          >
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
              <VStack align="start" gap={1}>
                <HStack gap={2} flexWrap="wrap">
                  <Icon as={FiFileText} color="green.500" />
                  <Heading size="lg">{documento.titulo}</Heading>
                  {documento.codigo && <Badge colorPalette="green">{documento.codigo}</Badge>}
                </HStack>
                <Badge colorPalette="blue" variant="subtle" alignSelf="flex-start">
                  {documento.tipo_documento.replace("_", " ")}
                </Badge>
                {documento.descripcion && (
                  <Text fontSize="sm" color="gray.600">
                    {documento.descripcion}
                  </Text>
                )}
              </VStack>
              <VStack align="end" gap={1}>
                <Badge colorPalette={documento.activo ? "green" : "red"}>
                  {documento.activo ? "Activo" : "Inactivo"}
                </Badge>
                <Text fontSize="sm" color="gray.600">
                  Versión vigente:{" "}
                  <Badge colorPalette="green">
                    {documento.version_vigente?.version ?? "—"}
                  </Badge>
                </Text>
              </VStack>
            </HStack>
          </Box>

          {versiones.length === 0 ? (
            <AlertMessage type="info" message="Este documento todavía no tiene versiones." />
          ) : (
            <>
              <DataTable
                items={versiones.slice((page - 1) * ITEMS_POR_PAGINA, page * ITEMS_POR_PAGINA)}
                columns={columnas}
                getRowKey={(v) => v.id}
                minW="1150px"
              />
              <TablePagination
                count={versiones.length}
                page={page}
                pageSize={ITEMS_POR_PAGINA}
                onPageChange={setPage}
                labelSingular="versión"
                labelPlural="versiones"
              />
            </>
          )}
        </>
      )}

      {/* Historial de revisiones de la versión seleccionada */}
      {versionRevisiones && (
        <DetalleModal
          open
          title={`Revisiones – ${versionRevisiones.version}`}
          icon={FiCalendar}
          onClose={() => setVersionRevisiones(null)}
          secciones={seccionesRevisiones}
        />
      )}

      {/* Confirmación de activar una versión histórica */}
      <AlertConfirm
        open={versionAActivar !== null}
        title="Activar versión"
        message={
          versionAActivar
            ? `Se activará la versión "${versionAActivar.version}" y la versión vigente pasará a histórica. ¿Continuar?`
            : ""
        }
        loading={activando}
        error={errorActivar}
        onConfirm={() => void confirmarActivacion()}
        onCancel={() => setVersionAActivar(null)}
      />
    </ListadoContainer>
  );
}
