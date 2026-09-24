import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { ElementType } from "react";
import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiEdit3,
  FiEye,
  FiPlus,
  FiTool,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../../components/ui";
import { ListadoContainer } from "../../components/layout";
import type { PlanPoe, TareaLimpieza } from "./types";
import {
  formatFrecuencia,
  formatMomento,
  getDestinoLabel,
  getRecursosLabel,
} from "./utils";

interface ListadoTareasProps {
  plan: PlanPoe;
  tareas: TareaLimpieza[];
  loading?: boolean;
  onAgregarTarea?: () => void;
  onModificarTarea?: (tarea: TareaLimpieza) => void;
  onVerTarea?: (tarea: TareaLimpieza) => void;
  onDarBajaTarea?: (tarea: TareaLimpieza) => void;
  onDarAltaTarea?: (tarea: TareaLimpieza) => void;
  onHistorial?: () => void;
  onModificarPlan?: () => void;
  onDarBajaPlan?: () => void;
  esBorrador?: boolean;
  onDarAltaPlan?: () => void;
}

const ITEMS_POR_PAGINA = 5;

const Chip = ({
  icon,
  texto,
  colorPalette = "gray",
}: {
  icon?: ElementType;
  texto: string;
  colorPalette?: string;
}) => (
  <Badge
    colorPalette={colorPalette}
    px={3}
    py={1}
    fontSize='sm'
    display='flex'
    alignItems='center'
    gap={2}
  >
    {icon && <Icon as={icon} />}
    {texto}
  </Badge>
);

export const ListadoTareas = ({
  plan,
  tareas,
  loading = false,
  esBorrador = false,
  onAgregarTarea,
  onModificarTarea,
  onVerTarea,
  onDarBajaTarea,
  onDarAltaTarea,
  onHistorial,
  onModificarPlan,
  onDarBajaPlan,
  onDarAltaPlan,
}: ListadoTareasProps) => {
  const [page, setPage] = useState(1);

  const itemsPaginados = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return tareas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [tareas, page]);

  const columnas: ColumnDef<TareaLimpieza>[] = [
    {
      key: "nombre",
      label: "Tarea de Limpieza",
      render: (tarea) => <Text fontWeight='semibold'>{tarea.nombre}</Text>,
    },
    {
      key: "destino",
      label: "Destino (Objeto)",
      render: (tarea) => getDestinoLabel(tarea),
    },
    {
      key: "momento",
      label: "Momento",
      render: (tarea) => formatMomento(tarea.momento),
    },
    {
      key: "frecuencia",
      label: "Frecuencia",
      render: (tarea) => formatFrecuencia(tarea),
    },
    {
      key: "recursos",
      label: "Insumos Químicos",
      render: (tarea) => getRecursosLabel(tarea),
    },
    {
      key: "estado",
      label: "Estado",
      render: (tarea) => (
        <Badge colorPalette={tarea.activo ? "green" : "red"}>
          {tarea.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (tarea) => (
        <RowActions>
          <RowActionButton
            icon={FiEdit2}
            label='Editar'
            colorPalette='blue'
            onClick={() => onModificarTarea?.(tarea)}
            visible={tarea.activo}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => onVerTarea?.(tarea)}
          />
          <RowActionButton
            icon={FiTrash2}
            label='Baja'
            colorPalette='red'
            onClick={() => onDarBajaTarea?.(tarea)}
            visible={tarea.activo}
          />
          <RowActionButton
            icon={FiCheckCircle}
            label='Dar de alta'
            colorPalette='green'
            onClick={() => onDarAltaTarea?.(tarea)}
            visible={!tarea.activo}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <ListadoContainer maxW='7xl'>
        <HStack
          justify='space-between'
          align='center'
          flexWrap='wrap'
          gap={2}
          mb={3}
        >
          <Heading
            size='xl'
            color='green'
            display='flex'
            alignItems='center'
            gap={2}
          >
            <Icon as={FiTool} />
            Plan de Limpieza y Sanitización (POES)
          </Heading>
          <HStack gap={2} flexWrap='wrap'>
            <Button
              variant='ghost'
              colorPalette='blue'
              onClick={onModificarPlan}
            >
              <FiEdit3 /> Modificar
            </Button>
            <Button variant='ghost' colorPalette='yellow' onClick={onHistorial}>
              <FiClock /> Historial
            </Button>
            {esBorrador && (
              <Button
                variant='ghost'
                colorPalette='green'
                onClick={onDarAltaPlan}
              >
                <FiCheckCircle /> Dar de alta
              </Button>
            )}
            <Button variant='ghost' colorPalette='red' onClick={onDarBajaPlan}>
              <FiTrash2 /> Dar de baja
            </Button>
          </HStack>
        </HStack>

        <HStack gap={2} mb={4} flexWrap='wrap'>
          <Chip
            icon={FiActivity}
            texto={`Estado: ${esBorrador ? "Borrador" : "Vigente"}`}
            colorPalette={esBorrador ? "orange" : "green"}
          />
          <Chip
            icon={FiUser}
            texto={`Elaborado por: Santiago Breczko`}
            colorPalette='orange'
          />
        </HStack>

        <VStack align='start' gap={2} mb={6}>
          <Flex align='baseline' gap={1} flexWrap='wrap'>
            <Text as='span' fontWeight='semibold'>
              Objetivo:
            </Text>
            <Text as='span'>{plan.objetivo ?? "—"}</Text>
          </Flex>
        </VStack>
      </ListadoContainer>

      <ListadoContainer maxW='7xl' mt={4}>
        <HStack
          justify='space-between'
          align='center'
          flexWrap='wrap'
          gap={2}
          mb={5}
        >
          <Heading
            size='lg'
            color='green'
            display='flex'
            alignItems='center'
            gap={2}
          >
            <Icon as={FiTool} />
            Tareas del Plan
          </Heading>
          <Button colorPalette='green' onClick={onAgregarTarea}>
            <FiPlus /> Agregar tarea
          </Button>
        </HStack>

        {loading && <LoadingState message='Cargando plan...' />}

        {!loading && tareas.length === 0 && (
          <AlertMessage
            type='info'
            message='El plan no tiene tareas cargadas todavía.'
          />
        )}

        {!loading && tareas.length > 0 && (
          <>
            <Box overflowX='auto'>
              <DataTable
                items={itemsPaginados}
                columns={columnas}
                getRowKey={(tarea) => tarea.id}
              />
            </Box>
            <TablePagination
              count={tareas.length}
              page={page}
              pageSize={ITEMS_POR_PAGINA}
              onPageChange={setPage}
              labelSingular='tarea'
              labelPlural='tareas'
            />
          </>
        )}
      </ListadoContainer>
    </>
  );
};
