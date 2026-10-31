import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiActivity,
  FiBookOpen,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiEdit2,
  FiEdit3,
  FiEye,
  FiHash,
  FiList,
  FiPlus,
  FiPrinter,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { ElementType } from "react";
import {
  AlertConfirm,
  AlertDelete,
  AlertMessage,
  DataTable,
  FormModal,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../../components/ui";
import { ListadoContainer } from "../../components/layout";
import { ITEMS_POR_PAGINA } from "../../config";
import { recetasApi } from "./hooks/recetaApi";
import {
  PasoRecetaModal,
  type ModoPasoForm,
} from "./PasoRecetaModal";
import { PasoRecetaDetalle } from "./PasoRecetaDetalle";
import { RecetaForm } from "./RecetaForm";
import { imprimirFichaReceta } from "./utils/imprimirFichaReceta";
import { FichaRecetaPrint } from "./FichaRecetaPrint";
import type { PasoReceta, Receta } from "./types";

const estadoInfo: Record<
  Receta["estado"],
  { texto: string; color: string }
> = {
  BORRADOR: { texto: "Borrador", color: "orange" },
  ACTIVA: { texto: "Activa", color: "green" },
  INHABILITADA: { texto: "Inhabilitada", color: "red" },
};

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
    fontSize="sm"
    display="flex"
    alignItems="center"
    gap={2}
  >
    {icon && <Icon as={icon} />}
    {texto}
  </Badge>
);

const Dato = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <HStack align="baseline" gap={1} flexWrap="wrap">
    <Text as="span" fontWeight="semibold">
      {label}:
    </Text>
    <Text as="span">{children}</Text>
  </HStack>
);

const formatFecha = (fecha?: string) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface RecetaWorkspaceProps {
  initialReceta?: Receta;
  onCambio?: () => void;
  onPromovido?: () => void;
  onCrearReceta?: () => void;
}

export default function RecetaWorkspace({
  initialReceta,
  onCambio,
  onPromovido,
  onCrearReceta,
}: RecetaWorkspaceProps) {
  const navigate = useNavigate();
  const { recetaId } = useParams();
  const id = Number(recetaId);

  const idInvalido = !initialReceta && (!recetaId || Number.isNaN(id));
  const [loading, setLoading] = useState(!initialReceta && !idInvalido);
  const [receta, setReceta] = useState<Receta | null>(initialReceta ?? null);
  const [error, setError] = useState(
    idInvalido ? "La receta solicitada no es válida." : "",
  );
  const [success, setSuccess] = useState("");

  const [modificarAbierto, setModificarAbierto] = useState(false);
  const [activando, setActivando] = useState(false);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  const [confirmarActivar, setConfirmarActivar] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const [modalPasoAbierto, setModalPasoAbierto] = useState(false);
  const [modoPaso, setModoPaso] = useState<ModoPasoForm>("crear");
  const [pasoSeleccionado, setPasoSeleccionado] = useState<
    PasoReceta | undefined
  >(undefined);

  const [pasoEliminar, setPasoEliminar] = useState<PasoReceta | null>(null);
  const [eliminandoPaso, setEliminandoPaso] = useState(false);
  const [errorEliminarPaso, setErrorEliminarPaso] = useState("");

  const [pasoVer, setPasoVer] = useState<PasoReceta | null>(null);

  useEffect(() => {
    if (initialReceta || !recetaId || Number.isNaN(id)) return;

    let active = true;
    recetasApi
      .obtenerReceta(id)
      .then((data) => {
        if (active) setReceta(data);
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la receta.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, initialReceta, recetaId]);

  const volver = () => navigate("/recetas");

  const pasosOrdenados = useMemo(
    () =>
      [...(receta?.pasos ?? [])].sort(
        (a, b) => a.numero_orden - b.numero_orden,
      ),
    [receta?.pasos],
  );

  const siguienteOrden = useMemo(() => {
    if (pasosOrdenados.length === 0) return 1;
    return (
      Math.max(...pasosOrdenados.map((p) => p.numero_orden)) + 1
    );
  }, [pasosOrdenados]);

  const recursosInactivosPorPaso = useMemo(() => {
    const lista: Array<{
      pasoNumero: number;
      pasoTitulo: string;
      recursos: Array<{ tipo: "equipo" | "insumo"; nombre: string }>;
    }> = [];

    (receta?.pasos ?? []).forEach((paso) => {
      const recursos: Array<{ tipo: "equipo" | "insumo"; nombre: string }> = [];

      paso.equipos?.forEach((pe) => {
        if (pe.equipo && pe.equipo.activo === false) {
          recursos.push({
            tipo: "equipo",
            nombre: pe.equipo.nombre,
          });
        }
      });
      paso.insumos?.forEach((pi) => {
        if (pi.insumo && pi.insumo.disponible === false) {
          recursos.push({
            tipo: "insumo",
            nombre: pi.insumo.nombre,
          });
        }
      });

      if (recursos.length > 0) {
        lista.push({
          pasoNumero: paso.numero_orden,
          pasoTitulo: paso.titulo,
          recursos,
        });
      }
    });

    return lista;
  }, [receta?.pasos]);

  const tieneRecursosInactivos = recursosInactivosPorPaso.length > 0;

  if (loading) {
    return (
      <Box p={10} bg="gray.100" minH="100vh">
        <Box maxW="7xl" mx="auto" mt={20}>
          <LoadingState message="Cargando receta..." />
        </Box>
      </Box>
    );
  }

  if (!receta) {
    return (
      <Box p={10} bg="gray.100" minH="100vh">
        <ListadoContainer maxW="4xl">
          <VStack gap={4}>
            <AlertMessage
              type="error"
              message={error || "No se encontró la receta solicitada."}
            />
            <Button colorPalette="green" onClick={volver}>
              <FiList /> Volver al listado
            </Button>
          </VStack>
        </ListadoContainer>
      </Box>
    );
  }

  const esBorrador = receta.estado === "BORRADOR";
  const esActiva = receta.estado === "ACTIVA";
  const esInhabilitada = receta.estado === "INHABILITADA";
  const estado = estadoInfo[receta.estado];
  const pasos = pasosOrdenados;
  const tienePasos = pasos.length > 0;
  const puedeModificar = esBorrador || (esActiva && !receta.tiene_lotes);
  const productoInactivo = receta.producto ? receta.producto.activo === false : false;

  const [page, setPage] = useState(1);

  const pasosPaginados = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return pasos.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [pasos, page]);

  useEffect(() => {
    const totalPages = Math.ceil(pasos.length / ITEMS_POR_PAGINA) || 1;
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [pasos.length, page]);



  const abrirCrearPaso = () => {
    setError("");
    setSuccess("");
    setPasoSeleccionado(undefined);
    setModoPaso("crear");
    setModalPasoAbierto(true);
  };

  const abrirModificarPaso = (paso: PasoReceta) => {
    setError("");
    setSuccess("");
    setPasoSeleccionado(paso);
    setModoPaso("modificar");
    setModalPasoAbierto(true);
  };

  const abrirVerPaso = (paso: PasoReceta) => {
    setPasoVer(paso);
  };

  const guardarPaso = (pasoGuardado: PasoReceta) => {
    setReceta((prev) => {
      if (!prev) return prev;
      const actuales = prev.pasos ?? [];
      const existe = actuales.some((p) => p.id === pasoGuardado.id);
      const nuevosPasos = existe
        ? actuales.map((p) => (p.id === pasoGuardado.id ? pasoGuardado : p))
        : [...actuales, pasoGuardado];
      return { ...prev, pasos: nuevosPasos };
    });
    setModalPasoAbierto(false);
    setPasoSeleccionado(undefined);
    setSuccess(
      modoPaso === "crear"
        ? "El paso fue agregado correctamente."
        : "El paso fue actualizado correctamente.",
    );
    onCambio?.();
  };

  const confirmarEliminarPaso = async () => {
    if (!pasoEliminar) return;
    setEliminandoPaso(true);
    setErrorEliminarPaso("");
    try {
      await recetasApi.eliminarPaso(pasoEliminar.id);
      const eliminadoId = pasoEliminar.id;
      setReceta((prev) =>
        prev
          ? {
              ...prev,
              pasos: (prev.pasos ?? []).filter((p) => p.id !== eliminadoId),
            }
          : prev,
      );
      setPasoEliminar(null);
      setSuccess("El paso fue eliminado correctamente.");
      onCambio?.();
    } catch (e) {
      setErrorEliminarPaso(
        e instanceof Error ? e.message : "No se pudo eliminar el paso.",
      );
    } finally {
      setEliminandoPaso(false);
    }
  };

  const columnasPasos: ColumnDef<PasoReceta>[] = [
    {
      key: "numero_orden",
      label: "Orden",
      render: (p) => (
        <Text>{p.numero_orden}</Text>
      ),
    },
    {
      key: "titulo",
      label: "Título",
      render: (p) => <Text fontWeight="semibold">{p.titulo}</Text>,
    },
    {
      key: "insumos",
      label: "Insumos Teóricos",
      render: (p) =>
        p.insumos?.length ? (
          <HStack gap={1} flexWrap="wrap">
            {p.insumos.map((i, idx) => {
              const inactivo = i.insumo?.disponible === false;
              return (
                <Text
                  key={i.id}
                  color={inactivo ? "red.600" : undefined}
                  fontWeight={inactivo ? "medium" : undefined}
                >
                  {i.insumo?.nombre ?? `Insumo #${i.insumo_id}`} ({i.cantidad_consumo_estimada}
                  {i.insumo?.unidad_medida ? ` ${i.insumo.unidad_medida}` : ""})
                  {idx < (p.insumos?.length ?? 0) - 1 ? "," : ""}
                </Text>
              );
            })}
          </HStack>
        ) : (
          "—"
        ),
    },
    {
      key: "equipos",
      label: "Equipos",
      render: (p) =>
        p.equipos?.length ? (
          <HStack gap={1} flexWrap="wrap">
            {p.equipos.map((e, idx) => {
              const inactivo = e.equipo?.activo === false;
              return (
                <Text
                  key={e.id}
                  color={inactivo ? "red.600" : undefined}
                  fontWeight={inactivo ? "medium" : undefined}
                >
                  {e.equipo?.nombre ?? `Equipo #${e.equipo_id}`} (x{e.cantidad})
                  {idx < (p.equipos?.length ?? 0) - 1 ? "," : ""}
                </Text>
              );
            })}
          </HStack>
        ) : (
          "—"
        ),
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (p) => (
        <RowActions>
          {esBorrador && (
            <RowActionButton
              icon={FiEdit2}
              label="Editar"
              colorPalette="blue"
              onClick={() => abrirModificarPaso(p)}
            />
          )}
          <RowActionButton
            icon={FiEye}
            label="Ver"
            colorPalette="yellow"
            onClick={() => abrirVerPaso(p)}
          />
          {esBorrador && (
            <RowActionButton
              icon={FiTrash2}
              label="Eliminar"
              colorPalette="red"
              onClick={() => {
                setErrorEliminarPaso("");
                setPasoEliminar(p);
              }}
            />
          )}
        </RowActions>
      ),
    },
  ];

  const activar = async () => {
    setActivando(true);
    setErrorAccion("");
    try {
      const actualizada = await recetasApi.activarReceta(receta.id);
      setReceta(actualizada);
      setConfirmarActivar(false);
      setSuccess("La receta fue activada correctamente.");
      onPromovido?.();
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo activar la receta.",
      );
    } finally {
      setActivando(false);
    }
  };

  const darDeBaja = async () => {
    setDandoDeBaja(true);
    setErrorAccion("");
    try {
      if (esBorrador) {
        await recetasApi.descartarReceta(receta.id);
      } else {
        await recetasApi.inhabilitarReceta(receta.id);
      }
      setConfirmarBaja(false);
      volver();
    } catch (e) {
      setErrorAccion(
        e instanceof Error ? e.message : "No se pudo dar de baja la receta.",
      );
    } finally {
      setDandoDeBaja(false);
    }
  };

  return (
    <Box p={10} bg="gray.100" minH="100vh">
      <ListadoContainer maxW="8xl">
        <HStack
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={2}
          mb={3}
        >
          <Heading
            size="xl"
            color="green"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Icon as={FiBookOpen} />
            {receta.nombre_receta}
          </Heading>
          <HStack gap={2} flexWrap="wrap">
            {puedeModificar && (
              <Button
                variant="ghost"
                colorPalette="blue"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setModificarAbierto(true);
                }}
              >
                <FiEdit3 /> Modificar
              </Button>
            )}
            <Button variant="ghost" colorPalette="yellow" onClick={volver}>
              <FiList /> Listado
            </Button>
            {(esActiva || esInhabilitada) && (
              <Button
                variant="ghost"
                colorPalette="blue"
                onClick={() => imprimirFichaReceta(receta)}
              >
                <FiPrinter /> Imprimir Ficha
              </Button>
            )}
            {esBorrador && (
              <Button
                variant="ghost"
                colorPalette="green"
                disabled={!tienePasos || tieneRecursosInactivos || productoInactivo}
                title={
                  productoInactivo
                    ? "El producto asociado está dado de baja. No se puede activar la receta."
                    : !tienePasos
                    ? "Agregá al menos un paso para poder activar la receta."
                    : tieneRecursosInactivos
                    ? "Hay pasos con recursos dados de baja. Modificalos para poder activar la receta."
                    : undefined
                }
                onClick={() => {
                  setErrorAccion("");
                  setConfirmarActivar(true);
                }}
              >
                <FiCheckCircle /> Dar de alta
              </Button>
            )}
            {(esBorrador || esActiva) && (
              <Button
                variant="ghost"
                colorPalette="red"
                onClick={() => {
                  setErrorAccion("");
                  setConfirmarBaja(true);
                }}
              >
                <FiTrash2 /> Dar de baja
              </Button>
            )}
            {esBorrador && onCrearReceta && (
              <Button
                variant="solid"
                colorPalette="green"
                onClick={onCrearReceta}
              >
                <FiPlus /> Nueva Receta
              </Button>
            )}
          </HStack>
        </HStack>

        <HStack gap={2} mb={4} flexWrap="wrap">
          <Chip
            icon={FiActivity}
            texto={`Estado: ${estado.texto}`}
            colorPalette={estado.color}
          />
          <Chip
            icon={FiBox}
            texto={`Producto: ${receta.producto?.nombre || receta.producto_id}${productoInactivo ? " (Dado de baja)" : ""}`}
            colorPalette={productoInactivo ? "red" : "purple"}
          />
          <Chip
            icon={FiCalendar}
            texto={`Fecha: ${formatFecha(receta.fecha_creacion)}`}
            colorPalette="blue"
          />
          {receta.fecha_baja && (
            <Chip
              icon={FiCalendar}
              texto={`Fecha de baja: ${formatFecha(receta.fecha_baja)}`}
              colorPalette="red"
            />
          )}
          <Chip
            icon={FiUser}
            texto={`Creado por: ${
              receta.usuario_creador_nombre || "—"
            }`}
            colorPalette="orange"
          />
        </HStack>

        <VStack align="stretch" gap={2} mb={2}>
          <Dato label="Código">{receta.codigo_receta}</Dato>
          <Dato label="Rendimiento estándar">
            {receta.producto?.unidad_medida?.simbolo
              ? `${receta.rendimiento_estandar} ${receta.producto.unidad_medida.simbolo}`
              : receta.rendimiento_estandar}
          </Dato>
          <Dato label="Tiempo estimado total">
            {receta.tiempo_estimado_total != null
              ? `${receta.tiempo_estimado_total} min`
              : "—"}
          </Dato>
          {receta.fecha_baja && (
            <Dato label="Fecha de baja">{formatFecha(receta.fecha_baja)}</Dato>
          )}
          <Dato label="Observaciones">{receta.observaciones || "—"}</Dato>
        </VStack>

        {esInhabilitada && (
          <AlertMessage
            type="info"
            message="La receta está inhabilitada. Para volver a usarla, copiala desde el listado de recetas."
          />
        )}

        {esBorrador && (
          productoInactivo ? (
            <AlertMessage
              type="warning"
              message={`El producto "${receta.producto?.nombre || "asociado"}" está dado de baja. No se puede activar la receta ya que el producto está dado de baja.`}
            />
          ) : !tienePasos ? (
            <AlertMessage
              type="info"
              message="Agregá al menos un paso para poder activar la receta."
            />
          ) : tieneRecursosInactivos ? (
            <AlertMessage
              type="warning"
              message={
                recursosInactivosPorPaso.length === 1
                  ? recursosInactivosPorPaso[0].recursos.length === 1
                    ? `El paso ${recursosInactivosPorPaso[0].pasoNumero} tiene el ${recursosInactivosPorPaso[0].recursos[0].tipo} "${recursosInactivosPorPaso[0].recursos[0].nombre}" dado de baja. Modificalo para poder activar la receta.`
                    : `El paso ${recursosInactivosPorPaso[0].pasoNumero} tiene recursos dados de baja: ${recursosInactivosPorPaso[0].recursos
                        .map((r) => `${r.tipo}: ${r.nombre}`)
                        .join(", ")}. Modificalo para poder activar la receta.`
                  : `Los siguientes pasos tienen recursos dados de baja: ${recursosInactivosPorPaso
                      .map(
                        (p) =>
                          `Paso ${p.pasoNumero} (${p.recursos
                            .map((r) => `${r.tipo}: ${r.nombre}`)
                            .join(", ")})`,
                      )
                      .join(", ")}. Modificalos para poder activar la receta.`
              }
            />
          ) : null
        )}

        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
      </ListadoContainer>

      <ListadoContainer maxW="8xl" mt={4}>
        <HStack
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={2}
          mb={4}
        >
          <Heading
            size="lg"
            color="green"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Icon as={FiHash} />
            Pasos de la receta
          </Heading>
          {esBorrador && (
            <Button colorPalette="green" onClick={abrirCrearPaso}>
              <FiPlus /> Agregar paso
            </Button>
          )}
        </HStack>

        {!tienePasos ? (
          <AlertMessage
            type="info"
            message="La receta no tiene pasos cargados todavía."
          />
        ) : (
          <>
            <DataTable
              items={pasosPaginados}
              columns={columnasPasos}
              getRowKey={(p) => p.id}
            />
            <TablePagination
              count={pasos.length}
              page={page}
              pageSize={ITEMS_POR_PAGINA}
              onPageChange={setPage}
              labelSingular="paso"
              labelPlural="pasos"
            />
          </>
        )}
      </ListadoContainer>

      <PasoRecetaModal
        open={modalPasoAbierto}
        modo={modoPaso}
        recetaId={receta.id}
        paso={pasoSeleccionado}
        pasosExistentes={receta.pasos ?? []}
        ordenSugerido={siguienteOrden}
        onClose={() => {
          setModalPasoAbierto(false);
          setPasoSeleccionado(undefined);
        }}
        onGuardado={guardarPaso}
      />

      {pasoVer && (
        <PasoRecetaDetalle
          paso={pasoVer}
          onCerrar={() => setPasoVer(null)}
        />
      )}

      <AlertDelete
        open={pasoEliminar !== null}
        title="Eliminar paso de la receta"
        name={pasoEliminar?.titulo ?? null}
        loading={eliminandoPaso}
        error={errorEliminarPaso}
        onConfirm={() => void confirmarEliminarPaso()}
        onCancel={() => {
          setPasoEliminar(null);
          setErrorEliminarPaso("");
        }}
      />

      <FormModal
        open={modificarAbierto}
        onClose={() => setModificarAbierto(false)}
      >
        <RecetaForm
          modo="modificar"
          receta={receta}
          onCancelar={() => setModificarAbierto(false)}
          onGuardado={(actualizada) => {
            setReceta(actualizada);
            setModificarAbierto(false);
            setSuccess("Los cambios se guardaron correctamente.");
            onCambio?.();
          }}
          enModal
        />
      </FormModal>

      <AlertConfirm
        open={confirmarActivar}
        title="Activar receta"
        message="¿Está seguro que desea activar esta receta? Si ya existe otra receta ACTIVA para este producto, se inhabilitará automáticamente."
        loading={activando}
        loadingText="Activando..."
        confirmLabel="Activar"
        error={errorAccion}
        onConfirm={() => void activar()}
        onCancel={() => {
          setConfirmarActivar(false);
          setErrorAccion("");
        }}
      />

      <AlertConfirm
        open={confirmarBaja}
        title={esBorrador ? "Descartar borrador" : "Dar de baja la receta"}
        message={
          esBorrador
            ? `¿Está seguro que desea descartar la receta "${receta.nombre_receta}"? Se eliminará definitivamente.`
            : `¿Está seguro que desea dar de baja la receta "${receta.nombre_receta}"? Pasará a estado INHABILITADA.`
        }
        loading={dandoDeBaja}
        error={errorAccion}
        onConfirm={() => void darDeBaja()}
        onCancel={() => {
          setConfirmarBaja(false);
          setErrorAccion("");
        }}
      />

      {(esActiva || esInhabilitada) && <FichaRecetaPrint receta={receta} />}
    </Box>
  );
}
