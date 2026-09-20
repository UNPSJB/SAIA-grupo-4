import { Badge } from "@chakra-ui/react";
import { FiEdit2, FiTrash2, FiCheckCircle, FiEye } from "react-icons/fi";
import { FaRuler } from "react-icons/fa";
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
import type { UnidadMedida } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoUnidadMedidaProps {
  onCrear?: () => void;
  onModificar?: (unidad: UnidadMedida) => void;
  onEliminar?: (unidad: UnidadMedida) => void;
  onVer?: (unidad: UnidadMedida) => void;
  onDarAlta?: (unidad: UnidadMedida) => void;
}

const ENDPOINT = "http://127.0.0.1:8000/unidades-de-medida/";
const ITEMS_POR_PAGINA = 5;

export const ListadoUnidadMedida = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
}: ListadoUnidadMedidaProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<UnidadMedida>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de unidades de medida.",
    });

  const columnas: ColumnDef<UnidadMedida>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (unidad) => unidad.nombre,
    },
    {
      key: "simbolo",
      label: "Simbolo",
      render: (unidad) => unidad.simbolo,
    },
    {
      key: "tipo_magnitud",
      label: "Tipo de magnitud",
      render: (unidad) => unidad.tipo_magnitud,
    },
    {
      key: "disponible",
      label: "Disponible",
      render: (unidad) => (
        <Badge colorPalette={unidad.disponible ? "green" : "red"}>
          {unidad.disponible ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (unidad) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(unidad)}
            visible={unidad.disponible}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(unidad)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(unidad)}
            visible={unidad.disponible}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(unidad)}
            visible={!unidad.disponible}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <ListadoHeader
        title='Unidades de Medida'
        icon={FaRuler}
        buttonLabel='Nueva unidad de medida'
        onCrear={onCrear}
      />

      {loading && <LoadingState message='Cargando unidades de medida...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message='Todavía no hay unidades de medida cargadas.'
        />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(unidad) => unidad.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='unidad de medida'
            labelPlural='unidades de medida'
          />
        </>
      )}
    </ListadoContainer>
  );
};
