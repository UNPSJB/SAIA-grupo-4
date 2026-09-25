import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Button, Heading, HStack, Icon } from "@chakra-ui/react";
import { FiArrowLeft, FiClock, FiEye, FiUser } from "react-icons/fi";
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
import { usePlanCatalogs } from "../features/planes/hooks/usePlanCatalogs";
import { planesApi } from "../features/planes/hooks/planApi";
import type { PlanPOES, TareaPOES } from "../features/planes/types";
import {
  colorFrecuencia,
  derivarEstado,
  formatFecha,
  formatFrecuencia,
  formatMomento,
} from "../features/planes/utils";

const ITEMS_POR_PAGINA = 5;

const labelsEstado = {
  borrador: { texto: "Borrador", color: "orange" },
  vigente: { texto: "Vigente", color: "green" },
  archivado: { texto: "Archivado", color: "red" },
} as const;

export default function HistorialPlanesPage() {
  const navigate = useNavigate();
  const { loading, error: errorPlanes, planes } = usePlanData();
  const { catalogs, error: errorCatalogos } = usePlanCatalogs();

  const [page, setPage] = useState(1);
  const [planVer, setPlanVer] = useState<PlanPOES | null>(null);
  const [tareasPlanVer, setTareasPlanVer] = useState<TareaPOES[]>([]);
  const [cargandoTareasModal, setCargandoTareasModal] = useState(false);
  const [tareasPorPlan, setTareasPorPlan] = useState<
    Record<number, TareaPOES[]>
  >({});

  useEffect(() => {
    let active = true;
    if (planes.length === 0) return;
    (async () => {
      const mapa: Record<number, TareaPOES[]> = {};
      await Promise.all(
        planes.map(async (p) => {
          try {
            mapa[p.id] = await planesApi.obtenerTareas(p.id);
          } catch {
            mapa[p.id] = [];
          }
        }),
      );
      if (active) setTareasPorPlan(mapa);
    })();
    return () => {
      active = false;
    };
  }, [planes]);

  const itemsPaginados = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return planes.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [planes, page]);

  const verPlan = async (plan: PlanPOES) => {
    setPlanVer(plan);
    setCargandoTareasModal(true);
    setTareasPlanVer([]);
    try {
      const ts = await planesApi.obtenerTareas(plan.id);
      setTareasPlanVer(ts);
    } catch {
      setTareasPlanVer([]);
    } finally {
      setCargandoTareasModal(false);
    }
  };

  const columnas: ColumnDef<PlanPOES>[] = [
    { key: "nombre", label: "Nombre", render: (plan) => plan.nombre },
    {
      key: "autor",
      label: "Elaborado por",
      render: (plan) => {
        const autor = catalogs.personas.find(
          (p) => p.id === plan.elaborado_por_id,
        );
        return autor ? `${autor.nombre} ${autor.apellido}` : "—";
      },
    },
    {
      key: "fecha_emision",
      label: "Fecha de emisión",
      render: (plan) => formatFecha(plan.fecha_emision),
    },
    {
      key: "fecha_hasta",
      label: "Fecha hasta",
      render: (plan) => formatFecha(plan.fecha_hasta) ?? "—",
    },
    {
      key: "tareas",
      label: "Tareas",
      align: "center",
      render: (plan) => tareasPorPlan[plan.id]?.length ?? "—",
    },
    {
      key: "estado",
      label: "Estado",
      render: (plan) => {
        const estado = labelsEstado[derivarEstado(plan)];
        return <Badge colorPalette={estado.color}>{estado.texto}</Badge>;
      },
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (plan) => (
        <RowActions>
          <RowActionButton
            icon={FiEye}
            label='Ver'
            colorPalette='yellow'
            onClick={() => verPlan(plan)}
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
            { label: "Nombre", valor: planVer.nombre },
            {
              label: "Elaborado por",
              valor: (() => {
                const autor = catalogs.personas.find(
                  (p) => p.id === planVer.elaborado_por_id,
                );
                return autor ? `${autor.nombre} ${autor.apellido}` : "—";
              })(),
            },
            {
              label: "Estado",
              valor: (() => {
                const estado = labelsEstado[derivarEstado(planVer)];
                return (
                  <Badge colorPalette={estado.color}>{estado.texto}</Badge>
                );
              })(),
            },
            {
              label: "Fecha de emisión",
              valor: formatFecha(planVer.fecha_emision),
            },
            {
              label: "Fecha de baja",
              valor: formatFecha(planVer.fecha_hasta) ?? "—",
            },
            { label: "Objetivo", valor: planVer.objetivo || "—" },
          ],
        },
        {
          titulo: "Tareas del Plan",
          icono: FiUser,
          items:
            cargandoTareasModal || tareasPlanVer.length > 0
              ? tareasPlanVer.map((t) => ({
                  label: t.nombre,
                  valor: (
                    <HStack gap={2} flexWrap='wrap'>
                      {formatMomento(t.tipo_poes)} ·{" "}
                      <Badge colorPalette={colorFrecuencia[t.frecuencia]}>
                        {formatFrecuencia(t)}
                      </Badge>
                    </HStack>
                  ),
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

      {(errorPlanes || errorCatalogos) && (
        <AlertMessage type='error' message={errorPlanes || errorCatalogos} />
      )}

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
          title={planVer.nombre}
          icon={FiEye}
          onClose={() => setPlanVer(null)}
          secciones={secciones}
        />
      )}
    </ListadoContainer>
  );
}
