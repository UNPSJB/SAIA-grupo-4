import { Badge, HStack, Button } from "@chakra-ui/react";
import {
  FiBox,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiEye,
  FiPlus,
} from "react-icons/fi";
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
import type { Insumo } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoInsumosProps {
  onCrear?: () => void;
  onModificar?: (insumo: Insumo) => void;
  onEliminar?: (insumo: Insumo) => void;
  onVer?: (insumo: Insumo) => void;
  onDarAlta?: (insumo: Insumo) => void;
  onVerUnidades?: () => void;
}

const ENDPOINT = "http://127.0.0.1:8000/insumos/";
const ITEMS_POR_PAGINA = 5;

export const ListadoInsumos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
}: ListadoInsumosProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Insumo>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de insumos.",
    });

  const columnas: ColumnDef<Insumo>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (insumo) => insumo.nombre,
    },
    {
      key: "unidad_medida",
      label: "Unidad de medida",
      render: (insumo) =>
        `${insumo.unidad_medida.nombre} (${insumo.unidad_medida.simbolo})`,
    },
    {
      key: "disponible",
      label: "Disponible",
      render: (insumo) => (
        <Badge colorPalette={insumo.disponible ? "green" : "red"}>
          {insumo.disponible ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (insumo) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(insumo)}
            visible={insumo.disponible}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(insumo)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(insumo)}
            visible={insumo.disponible}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(insumo)}
            visible={!insumo.disponible}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer>
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title="Insumos" icon={FiBox} />
        <HStack gap={2}>
          <Button
            variant="outline"
            colorPalette="green"
            onClick={onVerUnidades}
          >
            <FaRuler /> Unidades de medida
          </Button>
          <Button colorPalette="green" onClick={onCrear}>
            <FiPlus /> Nuevo insumo
          </Button>
        </HStack>
      </HStack>

      {loading && <LoadingState message='Cargando insumos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage type='info' message='Todavía no hay insumos cargados.' />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(insumo) => insumo.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='insumo'
            labelPlural='insumos'
          />
        </>
      )}
    </ListadoContainer>
  );
};
