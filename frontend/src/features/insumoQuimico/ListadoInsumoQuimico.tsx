import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { useState } from "react";
import { Badge, Box, HStack, Button } from "@chakra-ui/react";
import {
  FiEdit2,
  FiEye,
  FiTrash2,
  FiCheckCircle,
  FiDroplet,
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
import type { InsumoQuimico } from "./types";
import type { ColumnDef } from "../../components/ui";

interface ListadoInsumosQuimicosProps {
  onCrear?: () => void;
  onModificar?: (insumoQuimico: InsumoQuimico) => void;
  onEliminar?: (insumoQuimico: InsumoQuimico) => void;
  onVer?: (insumoQuimico: InsumoQuimico) => void;
  onDarAlta?: (insumoQuimico: InsumoQuimico) => void;
  onVerUnidades?: () => void;
}

// Arma el endpoint del listado: solo se manda la búsqueda si tiene valor.
const construirEndpoint = (busqueda: string) => {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);

  const query = params.toString();
  return `${BASE_URL}/insumos-quimicos/${query ? `?${query}` : ""}`;
};

const formatearConsumo = (consumo: number) =>
  Number(consumo).toLocaleString("es-AR", {
    maximumFractionDigits: 3,
  });

export const ListadoInsumosQuimicos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onVerUnidades,
}: ListadoInsumosQuimicosProps) => {
  // Texto del input (inmediato) y texto que realmente viaja al backend (con debounce)
  const [busqueda, setBusqueda] = useState("");
  const busquedaAplicada = useDebounce(busqueda.trim(), 300);

  // La página vuelve a 1 sola cuando cambia el endpoint (lo resuelve el hook)
  const { data, loading, error, page, setPage, itemsPaginados } =
    useListadoData<InsumoQuimico>({
      endpoint: construirEndpoint(busquedaAplicada),
      pageSize: ITEMS_POR_PAGINA,
      errorMessage: "No se pudo cargar la lista de insumos químicos.",
    });

  const columnas: ColumnDef<InsumoQuimico>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (insumoQuimico) => insumoQuimico.nombre,
    },
    {
      key: "asociacion",
      label: "Asociado a",
      render: (insumoQuimico) => {
        if (insumoQuimico.equipo) {
          return (
            <Badge colorPalette='purple' variant='subtle'>
              Equipo: {insumoQuimico.equipo.nombre}
            </Badge>
          );
        }
        if (insumoQuimico.sector) {
          return (
            <Badge colorPalette='blue' variant='subtle'>
              Sector: {insumoQuimico.sector.nombre}
            </Badge>
          );
        }
        return "Sin asignar";
      },
    },
    {
      key: "unidad_medida",
      label: "Consumo",
      render: (insumoQuimico) =>
        `${formatearConsumo(insumoQuimico.consumo)} ${insumoQuimico.unidad_medida.simbolo}`,
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
    <ListadoContainer maxW='6xl'>
      <HStack justify='space-between' mb={6} align='center'>
        <ListadoHeader title='Insumos Químicos' icon={FiDroplet} />
        <HStack gap={2}>
          <Button
            variant='outline'
            colorPalette='green'
            onClick={onVerUnidades}
          >
            <FaRuler /> Unidades de medida
          </Button>
          <Button colorPalette='green' onClick={onCrear}>
            <FiPlus /> Nuevo insumo químico
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
            ariaLabel='Buscar insumo químico'
            placeholder='Nombre, sector o equipo'
            value={busqueda}
            onChange={setBusqueda}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message='Cargando insumos químicos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && data.length === 0 && (
        <AlertMessage
          type='info'
          message={
            busquedaAplicada
              ? "No hay insumos químicos que coincidan con la búsqueda."
              : "Todavía no hay insumos químicos cargados."
          }
        />
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