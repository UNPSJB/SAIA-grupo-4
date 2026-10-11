import { BASE_URL, ITEMS_POR_PAGINA } from "../../config";
import { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Box,
  HStack,
  Text,
  VStack,
  NativeSelectRoot,
  NativeSelectField,
} from "@chakra-ui/react";
import {
  FiThermometer,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiEye,
  FiFilePlus,
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
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { useListadoData } from "../../hooks/useListadoData";
import type { Equipo } from "./types";
import type { ColumnDef } from "../../components/ui";

const formatearFechaISO = (fecha: string | null | undefined) => {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
};

const renderProximaCalibracion = (equipo: Equipo) => {
  if (!equipo.frecuencia_calibracion_dias || !equipo.fecha_ultima_calibracion) {
    return <Text>—</Text>;
  }

  const [anio, mes, dia] = equipo.fecha_ultima_calibracion
    .split("-")
    .map(Number);
  const ultima = new Date(anio, mes - 1, dia);
  const proxima = new Date(ultima);
  proxima.setDate(proxima.getDate() + equipo.frecuencia_calibracion_dias);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTiempo = proxima.getTime() - hoy.getTime();
  const diasRestantes = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

  let color = "green";
  let leyenda = "";

  if (diasRestantes < 0) {
    color = "red";
    leyenda = "(Vencido)";
  } else if (diasRestantes <= 15) {
    color = "yellow";
    leyenda = diasRestantes === 0 ? "(Hoy)" : `(En ${diasRestantes} días)`;
  } else {
    color = "green";
  }

  const proximaStr = `${String(proxima.getDate()).padStart(2, "0")}/${String(
    proxima.getMonth() + 1,
  ).padStart(2, "0")}/${proxima.getFullYear()}`;

  return (
    <VStack gap={0} align='start'>
      <HStack gap={2}>
        <Box
          w={3}
          h={3}
          borderRadius='full'
          bg={`${color}.500`}
          flexShrink={0}
        />
        <Text>{proximaStr}</Text>
      </HStack>
      {leyenda && (
        <Text fontSize='sm' fontStyle='italic' color='gray.500'>
          {leyenda}
        </Text>
      )}
    </VStack>
  );
};

interface ListadoEquiposProps {
  onCrear?: () => void;
  onModificar?: (equipo: Equipo) => void;
  onEliminar?: (equipo: Equipo) => void;
  onVer?: (equipo: Equipo) => void;
  onDarAlta?: (equipo: Equipo) => void;
  onRegistrarCalibracion?: (equipo: Equipo) => void;
}

const ENDPOINT = `${BASE_URL}/equipos/`;
export const ListadoEquipos = ({
  onCrear,
  onModificar,
  onEliminar,
  onVer,
  onDarAlta,
  onRegistrarCalibracion,
}: ListadoEquiposProps) => {
  const { data, loading, error, page, setPage } = useListadoData<Equipo>({
    endpoint: ENDPOINT,
    pageSize: ITEMS_POR_PAGINA,
    errorMessage: "No se pudo cargar la lista de equipos.",
  });

  const [filtroEstado, setFiltroEstado] = useState<
    "activos" | "inactivos" | "todos"
  >("activos");

  useEffect(() => {
    setPage(1);
  }, [filtroEstado, setPage]);

  const equiposFiltrados = useMemo(() => {
    return data.filter((equipo) => {
      if (filtroEstado === "activos") return equipo.activo;
      if (filtroEstado === "inactivos") return !equipo.activo;
      return true;
    });
  }, [data, filtroEstado]);

  const inicio = (page - 1) * ITEMS_POR_PAGINA;
  const itemsMostrados = equiposFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  const columnas: ColumnDef<Equipo>[] = [
    {
      key: "codigo",
      label: "Código",
      render: (equipo) => equipo.numero_serie,
    },
    {
      key: "nombre",
      label: "Nombre",
      render: (equipo) => (
        <VStack align='start' gap={0}>
          <Text>{equipo.nombre}</Text>
          <Text fontSize='xs' color='gray.500'>
            {equipo.marca}
          </Text>
        </VStack>
      ),
    },
    {
      key: "asociado_a",
      label: "Asociado a",
      render: (equipo) => (
        <Badge colorPalette='blue'>Sector: {equipo.sector.nombre}</Badge>
      ),
    },
    {
      key: "frecuencia",
      label: "Frecuencia (días)",
      render: (equipo) =>
        equipo.frecuencia_calibracion_dias
          ? `${equipo.frecuencia_calibracion_dias} Días`
          : "—",
    },
    {
      key: "ultima_calibracion",
      label: "Última Calibración",
      render: (equipo) => formatearFechaISO(equipo.fecha_ultima_calibracion),
    },
    {
      key: "proxima_calibracion",
      label: "Próxima Calibración",
      render: (equipo) => renderProximaCalibracion(equipo),
    },
    {
      key: "activo",
      label: "Estado",
      render: (equipo) => (
        <Badge colorPalette={equipo.activo ? "green" : "red"}>
          {equipo.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (equipo) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Modificar'
            colorPalette='blue'
            onClick={() => onModificar?.(equipo)}
            visible={equipo.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVer?.(equipo)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Eliminar'
            colorPalette='red'
            onClick={() => onEliminar?.(equipo)}
            visible={equipo.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAlta?.(equipo)}
            visible={!equipo.activo}
          />
          <Button
            size='sm'
            variant='ghost'
            colorPalette='purple'
            onClick={() => onRegistrarCalibracion?.(equipo)}
            title='Registrar calibración'
            disabled={!equipo.activo}
          >
            <FiFilePlus />
          </Button>
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer maxW='6xl'>
      <ListadoHeader
        title='Equipos'
        icon={FiThermometer}
        /* ¡Acá borramos buttonLabel y onCrear para que no dibuje el botón doble! */
      >
        <HStack gap={4}>
          <NativeSelectRoot size='sm' w='130px' bg='white'>
            <NativeSelectField
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
            >
              <option value='activos'>Activos</option>
              <option value='inactivos'>Inactivos</option>
              <option value='todos'>Todos</option>
            </NativeSelectField>
          </NativeSelectRoot>

          {onCrear && (
            <Button colorPalette='green' onClick={onCrear}>
              <FiPlus /> Nuevo equipo
            </Button>
          )}
        </HStack>
      </ListadoHeader>

      {loading && <LoadingState message='Cargando equipos...' />}

      {!loading && error && <AlertMessage type='error' message={error} />}

      {!loading && !error && equiposFiltrados.length === 0 && (
        <AlertMessage
          type='info'
          message='No se encontraron equipos para el filtro seleccionado.'
        />
      )}

      {!loading && !error && equiposFiltrados.length > 0 && (
        <>
          <DataTable
            items={itemsMostrados}
            columns={columnas}
            getRowKey={(equipo) => equipo.id}
          />

          <TablePagination
            count={equiposFiltrados.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='equipo'
            labelPlural='equipos'
          />
        </>
      )}
    </ListadoContainer>
  );
};
