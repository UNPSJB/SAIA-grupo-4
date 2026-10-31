import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { useState } from "react";
import { Badge, Box, HStack, Button } from "@chakra-ui/react";
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
  FiltrosBar,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import { useDebounce } from "../../hooks/useDebounce";
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

// Arma el endpoint del listado: solo se manda la búsqueda si tiene valor.
const construirEndpoint = (busqueda: string) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);

  const query = params.toString();
  return `${BASE_URL}/insumos/${query ? `?${query}` : ""}`;
};

export const ListadoInsumos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
}: ListadoInsumosProps) => {
  // Texto del input (inmediato) y texto que realmente viaja al backend (con debounce)
  const [busqueda, setBusqueda] = useState("");
  const busquedaAplicada = useDebounce(busqueda.trim(), 300);

  // La página vuelve a 1 sola cuando cambia el endpoint (lo resuelve el hook)
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<Insumo>({
      endpoint: construirEndpoint(busquedaAplicada),
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
    <ListadoContainer maxW='6xl'>
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

      <Box mb={4}>
        <FiltrosBar
          ocultarAplicar
          onAplicar={() => {}} // la búsqueda se aplica sola mientras se escribe
          onLimpiar={() => setBusqueda("")}
          hayFiltrosActivos={busqueda !== ""}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar insumo'
            placeholder='Nombre o unidad de medida'
            value={busqueda}
            onChange={setBusqueda}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando insumos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            busquedaAplicada
              ? "No hay insumos que coincidan con la búsqueda."
              : "Todavía no hay insumos cargados."
          }
        />
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