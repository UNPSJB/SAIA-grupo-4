import { useState } from "react";
import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { HStack, Button, Badge, Box } from "@chakra-ui/react";
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
  FiltroSelect,
  FiltrosBar,
  FiltroTexto
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Producto } from "./types";
import type { ColumnDef } from "../../components/ui";
import type { UnidadMedida } from "../unidadMedida/types";

type FiltrosProducto = {
  busqueda: string;
  unidadId: string;
  estado: string;
};

const FILTROS_INICIALES: FiltrosProducto = { busqueda: "", unidadId: "", estado: "" };

const OPCIONES_ESTADO = [
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

const construirEndpoint = (filtros: FiltrosProducto) => {
  const params = new URLSearchParams();
  if (filtros.busqueda.trim()) params.set("busqueda", filtros.busqueda.trim());
  if (filtros.unidadId) params.set("unidad_de_medida_id", filtros.unidadId);
  if (filtros.estado) params.set("estado", filtros.estado);

  const query = params.toString();
  return `${BASE_URL}/productos/${query ? `?${query}` : ""}`;
};

interface ListadoProductosProps {
  onCrear?: () => void;
  onModificar?: (producto: Producto) => void;
  onEliminar?: (producto: Producto) => void;
  onVer?: (producto: Producto) => void;
  onDarAlta?: (producto: Producto) => void;
  onVerUnidades?: () => void;
}

export const ListadoProductos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
}: ListadoProductosProps) => {
  const [borrador, setBorrador] = useState<FiltrosProducto>(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState<FiltrosProducto>(FILTROS_INICIALES);

  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Producto>({
      endpoint: construirEndpoint(aplicados),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de productos.",
    });

  const { data: unidades } = useListadoData<UnidadMedida>({
    endpoint: `${BASE_URL}/unidades-de-medida/`,
    errorMessage: "No se pudieron cargar las unidades de medida.",
  });

  const hayFiltros = borrador.busqueda !== "" || borrador.unidadId !== "" || borrador.estado !== "";
  const hayAplicados = aplicados.busqueda !== "" || aplicados.unidadId !== "" || aplicados.estado !== "";

  const aplicar = () => {
    setAplicados(borrador);
    setPage(1);
  };

  const limpiar = () => {
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setPage(1);
  };

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

      <Box mb={4}>
        <FiltrosBar onAplicar={aplicar} onLimpiar={limpiar} hayFiltrosActivos={hayFiltros} loading={loading}>
          <FiltroTexto 
            ariaLabel="Buscar Producto"
            placeholder="Nombre"
            value={borrador.busqueda}
            onChange={(valor) => setBorrador({ ...borrador, busqueda: valor})}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect 
            ariaLabel="Unidad de medida"
            placeholder="Todas las unidades"
            options={unidades.filter((u) => u.disponible).map((u) => ({ label: u.nombre, value: String(u.id) }))}
            value={borrador.unidadId}
            onChange={(valor) => setBorrador({ ...borrador, unidadId: valor })}
          />
          <FiltroSelect 
            ariaLabel="Estado del producto"
            placeholder="Todos los estados"
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) => setBorrador({ ...borrador, estado: valor})}
          />
        </FiltrosBar>
      </Box>
      
      {loading && <LoadingState message='Cargando productos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage type='info' message={hayAplicados ? "No hay productos que coincida con los filtros seleccionados." : "Todavía no hay productos cargados."} />
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