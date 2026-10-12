import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { Badge, Box, HStack, Button } from "@chakra-ui/react";
import {
  FiTag,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiPlus,
} from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import { ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { TipoIncidente } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoTiposIncidenteProps {
  onCrear?: () => void;
  onModificar?: (tipo: TipoIncidente) => void;
  onEliminar?: (tipo: TipoIncidente) => void;
  onDarAlta?: (tipo: TipoIncidente) => void;
}

export const ListadoTiposIncidentes = ({
  onCrear,
  onModificar,
  onEliminar,
  onDarAlta,
}: ListadoTiposIncidenteProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<TipoIncidente>({
      endpoint: `${BASE_URL}/tipos-incidente/`,
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de tipos.",
    });

  const columnas: ColumnDef<TipoIncidente>[] = [
    { key: "nombre", label: "Nombre", render: (t) => t.nombre },
    { key: "descripcion", label: "Descripcion", render: (t) => t.descripcion },
    {
      key: "activo",
      label: "Estado",
      render: (t) => (
        <Badge colorPalette={t.activo ? "green" : "red"}>
          {t.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (t) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(t)}
            visible={t.activo}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(t)}
            visible={t.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(t)}
            visible={!t.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <Box>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title='Tipos de Incidentes' icon={FiTag} />
        <Button colorPalette='green' onClick={onCrear}>
          <FiPlus /> Nuevo tipo
        </Button>
      </HStack>

      {loading && <LoadingState message='Cargando tipos...' />}
      {!loading && error && <AlertMessage type='error' message={error} />}
      {!loading && !error && data.length === 0 && (
        <AlertMessage type='info' message='Todavía no hay tipos cargados.' />
      )}
      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(t) => t.id}
          />
          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='tipo'
            labelPlural='tipos'
          />
        </>
      )}
    </Box>
  );
};
