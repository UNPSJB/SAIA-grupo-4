import { HStack, Button, Badge } from "@chakra-ui/react";
import { 
    FiEye,
    FiPlus,
    FiSettings,
} from "react-icons/fi"; // Importar otros íconos según sea necesario
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
    onCrear?: () => void;
    // Agregar las props del listado
}

const ENDPOINT = "http://127.0.0.1:8000/incidentes/";
const ITEMS_POR_PAGINA = 5;

const formatearFecha = (fecha: string) => {
  const fechaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha)
    ? fecha
    : `${fecha}Z`;

  return new Date(fechaConZona).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
};

export const ListadoIncidentes = ({
    onVer,
    onGestionarTipos,
    onCrear,
    // Agregar las props del listado
}: ListadoIncidentesProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Incidente>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
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
            // Agregar botones de acción según sea necesario
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title="Listado de Incidentes" />
        <HStack gap={2}>
          <Button variant='outline' colorPalette='green' onClick={onGestionarTipos}>
            <FiSettings /> Gestionar Tipos
          </Button>
          {onCrear && (
          <Button variant='solid' colorPalette='green' onClick={onCrear}>
            <FiPlus /> Registrar Incidente
          </Button>
          )}
        </HStack>
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