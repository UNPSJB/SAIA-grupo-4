import { Badge } from "@chakra-ui/react";
import {
  FiEdit2,
  FiEye,
  FiTrash2,
  FiCheckCircle,
  FiDroplet
} from "react-icons/fi";
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
import type { InsumoQuimico } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoInsumosQuimicosProps {
  onCrear?: () => void;
  onModificar?: (insumoQuimico: InsumoQuimico) => void;
  onEliminar?: (insumoQuimico: InsumoQuimico) => void;
  onVer?: (insumoQuimico: InsumoQuimico) => void;
  onDarAlta?: (insumoQuimico: InsumoQuimico) => void;
}

const ENDPOINT = "http://127.0.0.1:8000/insumos-quimicos/";
const ITEMS_POR_PAGINA = 5;

export const ListadoInsumosQuimicos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
}: ListadoInsumosQuimicosProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<InsumoQuimico>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de insumos.",
    });

  const columnas: ColumnDef<InsumoQuimico>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (insumoQuimico) => insumoQuimico.nombre,
    },
    {
      key: "unidad_medida",
      label: "Unidad de medida",
      render: (insumoQuimico) =>
        `${insumoQuimico.unidad_medida.nombre} (${insumoQuimico.unidad_medida.simbolo})`,
    },
    {
      key: "activo",
      label: "Activo",
      render: (insumoQuimico) => (
        <Badge colorPalette={insumoQuimico.activo ? "green" : "red"}>
          {insumoQuimico.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (insumoQuimico) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(insumoQuimico)}
            visible={insumoQuimico.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(insumoQuimico)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(insumoQuimico)}
            visible={insumoQuimico.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(insumoQuimico)}
            visible={!insumoQuimico.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <ListadoHeader
        title="Insumos Químicos"
        icon={FiDroplet}
        buttonLabel='Nuevo insumo químico'
        onCrear={onCrear}
      />
      
      {loading && <LoadingState message='Cargando insumos químicos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage type='info' message='Todavía no hay insumos químicos cargados.' />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(insumoQuimico) => insumoQuimico.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='insumo químico'
            labelPlural='insumos químicos'
          />
        </>
      )}
    </ListadoContainer>
  );
};