import { HStack, Button, Badge } from "@chakra-ui/react";
import { FiEye, FiSettings } from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Incidente } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoIncidentesProps {
  onVer?: (incidente: Incidente) => void;
  onGestionarTipos?: () => void;
  tipoId?: number | null;
  desde?: string;
  hasta?: string;
  refreshKey?: number;
}

const ENDPOINT = "http://127.0.0.1:8000/incidentes/";
const ITEMS_POR_PAGINA = 5;

const formatearFecha = (fecha: string) => {
  const fechaObj = new Date(fecha);
  return fechaObj.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ListadoIncidentes = ({
  onVer,
  onGestionarTipos,
  tipoId,
  desde,
  hasta,
  refreshKey,
}: ListadoIncidentesProps) => {
  const params = new URLSearchParams();
  if (tipoId) params.set("tipo_id", String(tipoId));
  if (tipoId && desde) params.set("desde", desde);
  if (tipoId && hasta) params.set("hasta", hasta);
  const filtrado = params.toString() !== "";
  const endpoint = filtrado ? `${ENDPOINT}?${params.toString()}` : ENDPOINT;

  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Incidente>({
      endpoint,
      pageSize: ITEMS_POR_PAGINA,
      refreshKey,
      errorMessage: "No se pudo cargar la lista de incidentes.",
    });

  const columnas: ColumnDef<Incidente>[] = [
    { key: "titulo", label: "Título", render: (i) => i.titulo },
    { key: "descripcion", label: "Descripción", render: (i) => i.descripcion },
    { key: "fecha", label: "Fecha", render: (i) => formatearFecha(i.fecha_hora_reporte) },
    {
      key: "estado",
      label: "Estado",
      render: (i) => (
        <Badge colorPalette={i.abierto ? "green" : "red"}>
          {i.abierto ? "Abierto" : "Cerrado"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (i) => (
        <RowActions>
          <RowActionButton
            icon={FiEye}
            label="Ver"
            colorPalette="yellow"
            onClick={() => onVer?.(i)}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title="Listado de Incidentes" />
        <HStack gap={2}>
          <Button variant="outline" colorPalette="green" onClick={onGestionarTipos}>
            <FiSettings /> Gestionar Tipos
          </Button>
        </HStack>
      </HStack>

      {loading && <LoadingState message="Cargando incidentes..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type="info"
          message={
            filtrado
              ? "No hay incidentes de este tipo en el período seleccionado."
              : "Todavía no hay incidentes reportados."
          }
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(incidente) => incidente.id}
          />
          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular="incidente"
            labelPlural="incidentes"
          />
        </>
      )}
    </ListadoContainer>
  );
};