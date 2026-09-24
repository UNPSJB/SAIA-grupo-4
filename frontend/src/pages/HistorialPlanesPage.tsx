import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Button, Heading, HStack, Icon } from "@chakra-ui/react";
import { FiArrowLeft, FiClock, FiCopy, FiEye } from "react-icons/fi";
import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../components/ui";
import {
  DetalleModal,
  ListadoContainer,
  type SeccionDetalle,
} from "../components/layout";
import { usePlanData } from "../features/planes/hooks/usePlanData";
import type { PlanPoe } from "../features/planes/types";
import { formatFrecuencia, formatMomento } from "../features/planes/utils";

const ITEMS_POR_PAGINA = 5;

export default function HistorialPlanesPage() {
  const navigate = useNavigate();
  const { loading, planes, getTareasDePlan } = usePlanData();

  const [page, setPage] = useState(1);
  const [planVer, setPlanVer] = useState<PlanPoe | null>(null);

  const itemsPaginados = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return planes.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [planes, page]);

  const columnas: ColumnDef<PlanPoe>[] = [
    { key: "nombre", label: "Nombre", render: (plan) => plan.nombre_plan },
    {
      key: "fecha_alta",
      label: "Fecha de alta",
      render: (plan) => plan.fecha_alta,
    },
    {
      key: "fecha_baja",
      label: "Fecha de baja",
      render: (plan) => plan.fecha_baja ?? "—",
    },
    {
      key: "tareas",
      label: "Tareas",
      align: "center",
      render: (plan) => getTareasDePlan(plan.id).length,
    },
    {
      key: "estado",
      label: "Estado",
      render: (plan) => (
        <Badge colorPalette={plan.estado === "vigente" ? "green" : "red"}>
          {plan.estado === "vigente" ? "Vigente" : "Dado de baja"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (plan) => (
        <RowActions>
          <RowActionButton
            icon={FiCopy}
            label='Ver'
            colorPalette='blue'
            onClick={() => {}}
          />
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => setPlanVer(plan)}
          />
        </RowActions>
      ),
    },
  ];

  const secciones: SeccionDetalle[] = planVer
    ? [
        {
          titulo: "Datos del Plan",
          icono: FiClock,
          items: [
            { label: "Nombre", valor: planVer.nombre_plan },
            { label: "Versión", valor: planVer.version },
            {
              label: "Estado",
              valor: (
                <Badge
                  colorPalette={planVer.estado === "vigente" ? "green" : "red"}
                >
                  {planVer.estado === "vigente" ? "Vigente" : "Dado de baja"}
                </Badge>
              ),
            },
            { label: "Fecha de alta", valor: planVer.fecha_alta },
            { label: "Fecha de baja", valor: planVer.fecha_baja ?? "—" },
            { label: "Descripción", valor: planVer.descripcion || "—" },
          ],
        },
        {
          titulo: "Tareas del Plan",
          icono: FiClock,
          items:
            getTareasDePlan(planVer.id).length > 0
              ? getTareasDePlan(planVer.id).map((t) => ({
                  label: t.nombre,
                  valor: `${formatMomento(t.momento)} · ${formatFrecuencia(t)}`,
                }))
              : [{ label: "Sin tareas", valor: "—" }],
        },
      ]
    : [];

  return (
    <ListadoContainer maxW='6xl'>
      <HStack
        justify='space-between'
        align='center'
        flexWrap='wrap'
        gap={2}
        mb={6}
      >
        <Heading
          size='xl'
          color='green'
          display='flex'
          alignItems='center'
          gap={2}
        >
          <Icon as={FiClock} />
          Historial de Planes POES
        </Heading>
        <Button
          variant='outline'
          colorPalette='green'
          onClick={() => navigate("/plan-poes")}
        >
          <FiArrowLeft /> Volver al plan vigente
        </Button>
      </HStack>

      {loading && <LoadingState message='Cargando historial...' />}

      {!loading && planes.length === 0 && (
        <AlertMessage
          type='info'
          message='Todavía no hay planes en el historial.'
        />
      )}

      {!loading && planes.length > 0 && (
        <>
          <Box overflowX='auto'>
            <DataTable
              items={itemsPaginados}
              columns={columnas}
              getRowKey={(plan) => plan.id}
            />
          </Box>
          <TablePagination
            count={planes.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='plan'
            labelPlural='planes'
          />
        </>
      )}

      {planVer && (
        <DetalleModal
          open
          title={`Plan ${planVer.version}`}
          icon={FiEye}
          onClose={() => setPlanVer(null)}
          secciones={secciones}
        />
      )}
    </ListadoContainer>
  );
}
