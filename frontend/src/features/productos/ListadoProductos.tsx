import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { HStack, Button, Badge } from "@chakra-ui/react";
import {
  FiPackage,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiEye,
  FiPlus
} from "react-icons/fi"
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
import type { Producto } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoProductosProps {
  onCrear?: () => void;
  onModificar?: (producto: Producto) => void;
  onEliminar?: (producto: Producto) => void;
  onVer?: (producto: Producto) => void;
  onDarAlta?: (producto: Producto) => void;
  onVerUnidades?: () => void;
}

const ENDPOINT = `${BASE_URL}/productos/`;
export const ListadoProductos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
}: ListadoProductosProps) => {
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Producto>({
      endpoint: ENDPOINT,
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de productos.",
    });

  const columnas: ColumnDef<Producto>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (p) => p.nombre,
    },
    {
      key: "unidad_medida",
      label: "Unidad de medida",
      render: (p) =>
        `${p.unidad_medida.nombre} (${p.unidad_medida.simbolo})`,
    },
    {
      key: "activo",
      label: "Activo",
      render: (p) => (
        <Badge colorPalette={p.activo ? "green" : "red"}>
          {p.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (p) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(p)}
            visible={p.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(p)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(p)}
            visible={p.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(p)}
            visible={!p.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer maxW="6xl">
      <HStack justify="space-between" mb={6} align="center">
        <ListadoHeader title="Productos" icon={FiPackage}/>
          <HStack gap={2}>
            <Button
              variant="outline"
              colorPalette="green"
              onClick={onVerUnidades}
            >
              <FaRuler /> Unidades de medida
            </Button>
            <Button colorPalette="green" onClick={onCrear}>
              <FiPlus /> Nuevo producto
            </Button>
        </HStack>
      </HStack>

      {loading && <LoadingState message='Cargando productos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage type='info' message='Todavía no hay productos cargados.' />
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(p) => p.id}
          />

          <TablePagination
            count={data.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='producto'
            labelPlural='productos'
          />
        </>
      )}
    </ListadoContainer>
  );
};