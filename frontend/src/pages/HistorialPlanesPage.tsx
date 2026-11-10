import { ITEMS_POR_PAGINA } from "../config";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { FiArrowLeft, FiClock, FiCopy, FiEye, FiUser, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Badge, Box, Button, Heading, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import {
  AlertConfirm,
  AlertMessage,
  DataTable,
  FiltroSelect,
  FiltrosBar,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../components/ui";
import { armarFiltros, etiquetaOpcion } from "../utils/exportacion";
import {
  DetalleModal,
  ListadoContainer,
  type SeccionDetalle,
} from "../components/layout";
import { usePlanData } from "../features/planes/hooks/usePlanData";
import { usePlanCatalogs } from "../features/planes/hooks/usePlanCatalogs";
import { planesApi } from "../features/planes/hooks/planApi";
import type {
  PlanCatalogs,
  PlanPOES,
  TareaPOES,
} from "../features/planes/types";
import {
  colorFrecuencia,
  derivarEstado,
  formatFecha,
  formatMomento,
  getDestinoDetalle,
  getDestinoLabel,
  getElementosLabel,
  getInsumosLabel,
  labelsDias,
  parsearDetalleFrecuencia,
} from "../features/planes/utils";

const labelsEstado = {
  borrador: { texto: "Borrador", color: "orange" },
  vigente: { texto: "Vigente", color: "green" },
  archivado: { texto: "Archivado", color: "red" },
} as const;

const OPCIONES_ESTADO = Object.entries(labelsEstado).map(([value, { texto }]) => ({
  label: texto,
  value,
}));

type FiltrosHistorial = {
  elaboradoPorId: string;
  estado: string;
};

const FILTROS_INICIALES: FiltrosHistorial = {
  elaboradoPorId: "",
  estado: "",
};

const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const TareaDesplegable = ({
  tarea,
  catalogs,
}: {
  tarea: TareaPOES;
  catalogs: PlanCatalogs;
}) => {
  const [abierto, setAbierto] = useState(false);
  const detalle = parsearDetalleFrecuencia(tarea.frecuencia, tarea.detalle_frecuencia);

  // Diccionario para mostrar el nombre limpio en la etiqueta de color
  const nombresFrecuenciaLimpia: Record<string, string> = {
    diaria: "Diaria",
    semanal: "Semanal",
    mensual: "Mensual",
    dias_especificos: "Días específicos",
  };
  
  const etiquetaFrecuencia = nombresFrecuenciaLimpia[tarea.frecuencia] || tarea.frecuencia;

  return (
    <VStack align="stretch" w="full" gap={1}>
      {/* Cabecera */}
      <HStack
        cursor="pointer"
        onClick={() => setAbierto(!abierto)}
        justify="space-between"
        p={2}
        borderRadius="md"
        _hover={{ bg: "gray.100" }}
        userSelect="none"
      >
        <Text fontWeight="semibold" fontSize="sm" color="gray.800">
          {tarea.nombre}
        </Text>
        <HStack gap={2}>
          <Text fontSize="xs" color="gray.500">
            {abierto ? "Ocultar detalle" : "Ver detalle"}
          </Text>
          {abierto ? <FiChevronUp /> : <FiChevronDown />}
        </HStack>
      </HStack>

      {/* Detalles desplegables */}
      {abierto && (
        <Box p={4} ml={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" boxShadow="sm">
          <VStack align="stretch" gap={2}>
            
            {/* Estado */}
            <HStack justify="space-between" borderBottomWidth="1px" pb={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500">Estado:</Text>
              <Badge colorPalette={tarea.activo ? "green" : "red"}>
                {tarea.activo ? "Activa" : "Inactiva"}
              </Badge>
            </HStack>

            {/* Destino */}
            <HStack justify="space-between" borderBottomWidth="1px" pb={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500">Destino:</Text>
              <Text fontSize="sm" color="gray.700">
                {getDestinoLabel(tarea, catalogs)} ({getDestinoDetalle(tarea, catalogs)})
              </Text>
            </HStack>

            {/* Momento y Frecuencia con Badge de color */}
            <HStack justify="space-between" borderBottomWidth="1px" pb={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500">Momento / Frecuencia:</Text>
              <HStack gap={2}>
                <Text fontSize="sm" color="gray.700">{formatMomento(tarea.tipo_poes)}</Text>
                <Badge colorPalette={colorFrecuencia[tarea.frecuencia]}>
                  {etiquetaFrecuencia}
                </Badge>
              </HStack>
            </HStack>

            {/* Detalles condicionales: Día de la semana */}
            {(tarea.frecuencia === "semanal" || tarea.frecuencia === "dias_especificos") && (
              <HStack justify="space-between" borderBottomWidth="1px" pb={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.500">Día(s):</Text>
                <Text fontSize="sm" color="gray.700">{labelsDias(detalle.dias)}</Text>
              </HStack>
            )}

            {/* Detalles condicionales: Día del mes */}
            {tarea.frecuencia === "mensual" && detalle.dia_mes && (
              <HStack justify="space-between" borderBottomWidth="1px" pb={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.500">Día del mes:</Text>
                <Text fontSize="sm" color="gray.700">{String(detalle.dia_mes)}</Text>
              </HStack>
            )}

            {/* Método */}
            <Box borderBottomWidth="1px" pb={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>Procedimiento (Método):</Text>
              <VStack align="stretch" gap={1} bg="gray.50" p={2} borderRadius="sm">
                {tarea.metodo.split('\n').filter(Boolean).map((paso, index) => (
                  <Text key={index} fontSize="sm" color="gray.700">
                    <Text as="span" fontWeight="bold" mr={1}>{index + 1}.</Text>
                    {paso.trim()}
                  </Text>
                ))}
              </VStack>
            </Box>

            {/* Recursos */}
            <VStack align="stretch" gap={1} pt={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500">Recursos requeridos:</Text>
              <Text fontSize="sm" color="gray.700">
                • <strong>Insumos químicos:</strong> {getInsumosLabel(tarea, catalogs)}
              </Text>
              <Text fontSize="sm" color="gray.700">
                • <strong>Elementos de limpieza:</strong> {getElementosLabel(tarea, catalogs)}
              </Text>
            </VStack>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

export default function HistorialPlanesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const origen = (location.state as { origen?: string } | null)?.origen;
  const desdeNuevoPlan = origen === "nuevo-plan";
  const { loading, error: errorPlanes, planes } = usePlanData();
  const { catalogs, error: errorCatalogos } = usePlanCatalogs();

  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [borrador, setBorrador] =
    useState<FiltrosHistorial>(FILTROS_INICIALES);
  const [aplicados, setAplicados] =
    useState<FiltrosHistorial>(FILTROS_INICIALES);
  const [planVer, setPlanVer] = useState<PlanPOES | null>(null);
  const [tareasPlanVer, setTareasPlanVer] = useState<TareaPOES[]>([]);
  const [cargandoTareasModal, setCargandoTareasModal] = useState(false);
  const [tareasPorPlan, setTareasPorPlan] = useState<
    Record<number, TareaPOES[]>
  >({});

  const [planCopiar, setPlanCopiar] = useState<PlanPOES | null>(null);
  const [pasoCopiar, setPasoCopiar] = useState<
    "confirmar" | "reemplazar" | null
  >(null);
  const [copiando, setCopiando] = useState(false);
  const [errorCopiar, setErrorCopiar] = useState("");

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

  const opcionesElaboradoPor = useMemo(() => {
    const idsAutores = new Set(planes.map((plan) => plan.elaborado_por_id));
    return catalogs.personas
      .filter((persona) => idsAutores.has(persona.id))
      .map((persona) => ({
        label: `${persona.nombre} ${persona.apellido}`,
        value: String(persona.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [planes, catalogs.personas]);

  const planesFiltrados = useMemo(() => {
    const texto = normalizarTexto(busquedaAplicada);

    return planes.filter((plan) => {
      if (
        aplicados.elaboradoPorId &&
        String(plan.elaborado_por_id) !== aplicados.elaboradoPorId
      ) {
        return false;
      }

      if (aplicados.estado && derivarEstado(plan) !== aplicados.estado) {
        return false;
      }

      if (!texto) return true;

      return normalizarTexto(`${plan.nombre} ${plan.objetivo ?? ""}`).includes(
        texto,
      );
    });
  }, [planes, aplicados, busquedaAplicada]);

  const hayFiltros =
    busqueda.trim() !== "" ||
    borrador.elaboradoPorId !== "" ||
    borrador.estado !== "";

  const aplicar = () => {
    setBusquedaAplicada(busqueda.trim());
    setAplicados(borrador);
    setPage(1);
  };

  const limpiar = () => {
    setBusqueda("");
    setBusquedaAplicada("");
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setPage(1);
  };

  const totalPaginas = Math.max(
    1,
    Math.ceil(planesFiltrados.length / ITEMS_POR_PAGINA),
  );
  const paginaActual = Math.min(page, totalPaginas);

  const itemsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return planesFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [planesFiltrados, paginaActual]);

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

  const resetearCopia = () => {
    setPlanCopiar(null);
    setPasoCopiar(null);
    setCopiando(false);
    setErrorCopiar("");
  };

  const ejecutarCopia = async () => {
    if (!planCopiar || !usuario) return;
    setCopiando(true);
    setErrorCopiar("");
    try {
      // Se eliminó la línea que borraba el plan anterior
      await planesApi.clonarPlan(planCopiar.id, usuario.id);
      resetearCopia();
      navigate("/nuevo-plan");
    } catch (e) {
      setErrorCopiar(
        e instanceof Error ? e.message : "No se pudo clonar el plan.",
      );
    } finally {
      setCopiando(false);
    }
  };

  const ejecutarRetomar = async (plan: PlanPOES) => {
    try {
      await planesApi.retomarBorrador(plan.id); // Asegurate de agregar esto en planApi.ts
      navigate("/nuevo-plan");
    } catch (e) {
      console.error("Error al retomar el borrador", e);
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
      valorExportacion: (plan) => labelsEstado[derivarEstado(plan)].texto,
      render: (plan) => {
        const estado = labelsEstado[derivarEstado(plan)];
        return <Badge colorPalette={estado.color}>{estado.texto}</Badge>;
      },
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
      align: "end",
      render: (plan) => {
        const estado = derivarEstado(plan);
        return (
          <RowActions>
            {(estado === "archivado" || estado === "vigente") && (
              <RowActionButton
                icon={FiCopy}
                label='Copiar'
                colorPalette='blue'
                onClick={() => {
                  setPlanCopiar(plan);
                  setPasoCopiar("confirmar");
                  setErrorCopiar("");
                }}
              />
            )}
            {estado === "borrador" && (
              <RowActionButton
                icon={FiCopy}
                label='Retomar'
                colorPalette='blue'
                onClick={() => ejecutarRetomar(plan)}
              />
            )}
            <RowActionButton
              icon={FiEye}
              label='Ver'
              colorPalette='yellow'
              onClick={() => verPlan(plan)}
            />
          </RowActions>
        );
      },
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
          columnas: 1,
          items:
            cargandoTareasModal || tareasPlanVer.length > 0
              ? tareasPlanVer.map((t) => ({
                  label: "", // Dejamos el label vacío porque el nombre ya va dentro del desplegable ordenado
                  valor: <TareaDesplegable tarea={t} catalogs={catalogs} />,
                }))
              : [{ label: "Sin tareas", valor: "—" }],
        },
      ]
    : [];

  return (
    <ListadoContainer>
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
          onClick={() =>
            navigate(desdeNuevoPlan ? "/nuevo-plan" : "/plan-poes")
          }
        >
          <FiArrowLeft />{" "}
          {desdeNuevoPlan ? "Volver al nuevo plan" : "Volver al plan vigente"}
        </Button>
      </HStack>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel='Buscar plan POES'
            placeholder='Nombre u objetivo del plan'
            value={busqueda}
            onChange={setBusqueda}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel='Elaborado por'
            placeholder='Todos los autores'
            options={opcionesElaboradoPor}
            value={borrador.elaboradoPorId}
            onChange={(valor) =>
              setBorrador((actual) => ({
                ...actual,
                elaboradoPorId: valor,
              }))
            }
          />
          <FiltroSelect
            ariaLabel='Estado del plan'
            placeholder='Todos los estados'
            options={OPCIONES_ESTADO}
            value={borrador.estado}
            onChange={(valor) =>
              setBorrador((actual) => ({ ...actual, estado: valor }))
            }
          />
        </FiltrosBar>
      </Box>

      {(errorPlanes || errorCatalogos) && (
        <AlertMessage type='error' message={errorPlanes || errorCatalogos} />
      )}

      {loading && <LoadingState message='Cargando historial...' />}

      {!loading && !errorPlanes && planes.length === 0 && (
        <AlertMessage
          type='info'
          message='Todavía no hay planes en el historial.'
        />
      )}

      {!loading &&
        !errorPlanes &&
        planes.length > 0 &&
        planesFiltrados.length === 0 && (
          <AlertMessage
            type='info'
            message='No hay planes que coincidan con los filtros seleccionados.'
          />
        )}

      {!loading && !errorPlanes && planesFiltrados.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            exportarItems={planesFiltrados}
            exportarTitulo="Historial de planes POES"
            exportarFiltros={armarFiltros([
              ["Búsqueda", busquedaAplicada],
              ["Elaborado por", etiquetaOpcion(opcionesElaboradoPor, aplicados.elaboradoPorId)],
              ["Estado", etiquetaOpcion(OPCIONES_ESTADO, aplicados.estado)],
            ])}
            columns={columnas}
            getRowKey={(plan) => plan.id}
          />
          <TablePagination
            count={planesFiltrados.length}
            page={paginaActual}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular='plan'
            labelPlural='planes'
          />
        </>
      )}

      <AlertConfirm
        open={planCopiar !== null && pasoCopiar === "confirmar"}
        title='Clonar plan'
        message={
          planCopiar
            ? `Se clonará el plan "${planCopiar.nombre}" con todas sus tareas y se creará un nuevo borrador. ¿Continuar?`
            : ""
        }
        loading={copiando}
        error={errorCopiar}
        onConfirm={() => void ejecutarCopia()}
        onCancel={resetearCopia}
      />

      {/* El segundo AlertConfirm de "reemplazar" SE BORRÓ COMPLETAMENTE */}

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
