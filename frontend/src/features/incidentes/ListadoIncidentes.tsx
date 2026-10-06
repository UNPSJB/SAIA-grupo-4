import { HStack, Badge } from "@chakra-ui/react";
import { FiEye, FiCheckCircle, FiRotateCcw } from "react-icons/fi";
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
  onCerrar?: (incidente: Incidente) => void;
  onReabrir?: (incidente: Incidente) => void;
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
  onCerrar,
  onReabrir,
  refreshKey
}: ListadoIncidentesProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Incidente>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
      refreshKey,
      errorMessage: "No se pudo cargar la lista de incidentes.",
    });

  const columnas: ColumnDef<Incidente>[] = [
    {
      key: "titulo",
      label: "Título",
      render: (incidente) => incidente.titulo,
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (incidente) => incidente.descripcion,
    },
    {
      key: "fecha",
      label: "Fecha",
      render: (incidente) => formatearFecha(incidente.fecha_hora_reporte),
    },
    {
      key: "estado",
      label: "Estado",
      render: (incidente) => (
        <Badge colorPalette={incidente.abierto ? "green" : "red"}>
          {incidente.abierto ? "Abierto" : "Cerrado"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (incidente) => (
        <RowActions>
          <RowActionButton
            icon={FiEye}
            label="Ver"
            colorPalette="yellow"
            onClick={() => onVer?.(incidente)}
          />
          {incidente.abierto ? (
            <RowActionButton
              icon={FiCheckCircle}
              label="Cerrar"
              colorPalette="green"
              onClick={() => onCerrar?.(incidente)}
            />
          ) : (
            <RowActionButton
              icon={FiRotateCcw}
              label="Reabrir"
              colorPalette="orange"
              onClick={() => onReabrir?.(incidente)}
            />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title="Listado de Incidentes" />
      </HStack>

      {loading && <LoadingState message="Cargando incidentes..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage type="info" message="Todavía no hay incidentes reportados." />
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