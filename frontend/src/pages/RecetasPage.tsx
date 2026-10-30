import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiCopy,
  FiEdit2,
  FiEye,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import {
  AlertConfirm,
  AlertDelete,
  AlertMessage,
  DataTable,
  FiltroSelect,
  FiltrosBar,
  FiltroTexto,
  FormModal,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { ITEMS_POR_PAGINA } from "../config";
import type { Equipo } from "../features/equipos/types";
import type { Insumo } from "../features/insumo/types";
import { RecetaDetalle } from "../features/recetas/RecetaDetalle";
import { RecetaForm } from "../features/recetas/RecetaForm";
import { ESTADOS_RECETA } from "../features/recetas/constants";
import { recetasApi } from "../features/recetas/hooks/recetaApi";
import { useRecetaData } from "../features/recetas/hooks/useRecetaData";
import type { FiltrosReceta, Receta } from "../features/recetas/types";

interface FiltrosEstado {
  busqueda: string;
  insumo_id: string;
  equipo_id: string;
  estado: string;
}

const FILTROS_INICIALES: FiltrosEstado = {
  busqueda: "",
  insumo_id: "",
  equipo_id: "",
  estado: "",
};

export default function RecetasPage() {
  const navigate = useNavigate();

  const [borrador, setBorrador] = useState<FiltrosEstado>(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState<FiltrosEstado>(FILTROS_INICIALES);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);

  useEffect(() => {
    recetasApi.obtenerInsumos().then(setInsumos).catch(() => setInsumos([]));
    recetasApi.obtenerEquipos().then(setEquipos).catch(() => setEquipos([]));
  }, []);

  const filtrosParaApi: FiltrosReceta = useMemo(
    () => ({
      busqueda: aplicados.busqueda || undefined,
      insumo_id: aplicados.insumo_id ? Number(aplicados.insumo_id) : undefined,
      equipo_id: aplicados.equipo_id ? Number(aplicados.equipo_id) : undefined,
      estado: aplicados.estado || undefined,
    }),
    [aplicados],
  );

  const { loading, error, recetas, recargar } = useRecetaData(filtrosParaApi);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [page, setPage] = useState(1);

  const hayFiltros = Object.values(borrador).some((valor) => valor !== "");
  const hayAplicados = Object.values(aplicados).some((valor) => valor !== "");

  const aplicar = () => {
    setAplicados(borrador);
    setPage(1);
  };

  const limpiar = () => {
    setBorrador(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    setPage(1);
  };

  const [recetaVer, setRecetaVer] = useState<Receta | null>(null);

  const [recetaEditar, setRecetaEditar] = useState<Receta | null>(null);
  const [pasandoABorrador, setPasandoABorrador] = useState(false);
  const [errorEditar, setErrorEditar] = useState("");

  const [retomando, setRetomando] = useState(false);
  const [errorRetomar, setErrorRetomar] = useState("");

  const [recetaCopiar, setRecetaCopiar] = useState<Receta | null>(null);
  const [copiando, setCopiando] = useState(false);
  const [errorCopiar, setErrorCopiar] = useState("");

  const [recetaEliminar, setRecetaEliminar] = useState<Receta | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  const itemsPaginados = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return recetas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [recetas, page]);

  const guardarReceta = (receta: Receta) => {
    setCrearAbierto(false);
    navigate(`/nueva-receta?recetaId=${receta.id}`);
  };

  const editarReceta = async (receta: Receta) => {
    setErrorRetomar("");
    if (receta.estado === "BORRADOR") {
      if (retomando) return;
      setRetomando(true);
      try {
        await recetasApi.retomarBorrador(receta.id);
        navigate(`/nueva-receta?recetaId=${receta.id}`);
      } catch (e) {
        setErrorRetomar(
          e instanceof Error ? e.message : "No se pudo retomar el borrador.",
        );
      } finally {
        setRetomando(false);
      }
      return;
    }
    if (receta.estado === "ACTIVA" && !receta.tiene_lotes) {
      setRecetaEditar(receta);
      setErrorEditar("");
    }
  };

  const ejecutarPasarABorrador = async () => {
    if (!recetaEditar) return;
    setPasandoABorrador(true);
    setErrorEditar("");
    try {
      await recetasApi.pasarABorrador(recetaEditar.id);
      const id = recetaEditar.id;
      setRecetaEditar(null);
      await recargar();
      navigate(`/nueva-receta?recetaId=${id}`);
    } catch (e) {
      setErrorEditar(
        e instanceof Error
          ? e.message
          : "No se pudo pasar la receta a borrador.",
      );
    } finally {
      setPasandoABorrador(false);
    }
  };

  const ejecutarCopiar = async () => {
    if (!recetaCopiar) return;
    setCopiando(true);
    setErrorCopiar("");
    try {
      await recetasApi.clonarReceta(recetaCopiar.id);
      setRecetaCopiar(null);
      navigate("/nueva-receta");
    } catch (e) {
      setErrorCopiar(
        e instanceof Error ? e.message : "No se pudo copiar la receta.",
      );
    } finally {
      setCopiando(false);
    }
  };

  const ejecutarEliminar = async () => {
    if (!recetaEliminar) return;
    setEliminando(true);
    setErrorEliminar("");
    try {
      if (recetaEliminar.estado === "BORRADOR") {
        await recetasApi.descartarReceta(recetaEliminar.id);
      } else {
        await recetasApi.inhabilitarReceta(recetaEliminar.id);
      }
      setRecetaEliminar(null);
      await recargar();
    } catch (e) {
      setErrorEliminar(
        e instanceof Error ? e.message : "No se pudo eliminar la receta.",
      );
    } finally {
      setEliminando(false);
    }
  };

  const columnas: ColumnDef<Receta>[] = [
    { key: "codigo_receta", label: "Código", render: (r) => r.codigo_receta },
    {
      key: "nombre_receta",
      label: "Nombre",
      render: (r) => {
        const coincidenciaInsumo = (() => {
          if (!aplicados.insumo_id) return null;
          const insumoObj = insumos.find(
            (i) => String(i.id) === String(aplicados.insumo_id),
          );
          const pasosCoincidentes = (r.pasos || [])
            .filter((p) =>
              p.insumos?.some(
                (i) => String(i.insumo_id) === String(aplicados.insumo_id),
              ),
            )
            .map((p) => `Paso ${p.numero_orden}`);

          if (pasosCoincidentes.length === 0) return null;
          return `Coincidencia: Insumo "${insumoObj?.nombre || "seleccionado"}" en ${pasosCoincidentes.join(", ")}`;
        })();

        const coincidenciaEquipo = (() => {
          if (!aplicados.equipo_id) return null;
          const equipoObj = equipos.find(
            (e) => String(e.id) === String(aplicados.equipo_id),
          );
          const pasosCoincidentes = (r.pasos || [])
            .filter((p) =>
              p.equipos?.some(
                (e) => String(e.equipo_id) === String(aplicados.equipo_id),
              ),
            )
            .map((p) => `Paso ${p.numero_orden}`);

          if (pasosCoincidentes.length === 0) return null;
          return `Coincidencia: Equipo "${equipoObj?.nombre || "seleccionado"}" en ${pasosCoincidentes.join(", ")}`;
        })();

        return (
          <VStack align="start" gap={0.5}>
            <Text>{r.nombre_receta}</Text>
            {coincidenciaInsumo && (
              <Text fontSize="xs" color="blue.600" fontWeight="medium">
                {coincidenciaInsumo}
              </Text>
            )}
            {coincidenciaEquipo && (
              <Text fontSize="xs" color="purple.600" fontWeight="medium">
                {coincidenciaEquipo}
              </Text>
            )}
          </VStack>
        );
      },
    },
    {
      key: "producto",
      label: "Producto",
      render: (r) => r.producto?.nombre || r.producto_id,
    },
    {
      key: "rendimiento_estandar",
      label: "Rendimiento",
      render: (r) => {
        const unidad = r.producto?.unidad_medida?.simbolo;
        return unidad ? `${r.rendimiento_estandar} ${unidad}` : r.rendimiento_estandar;
      },
    },
    {
      key: "tiempo_estimado_total",
      label: "Tiempo estimado",
      render: (r) =>
        r.tiempo_estimado_total != null ? `${r.tiempo_estimado_total} min` : "—",
    },
    {
      key: "estado",
      label: "Estado",
      render: (r) => {
        const estado = ESTADOS_RECETA[r.estado];
        return (
          <Badge colorPalette={estado?.color || "gray"}>
            {estado?.texto || r.estado}
          </Badge>
        );
      },
    },
    {
      key: "acciones",
      label: "Acciones",
      align: "end",
      render: (r) => {
        const puedeEditar =
          r.estado === "BORRADOR" ||
          (r.estado === "ACTIVA" && !r.tiene_lotes);
        const puedeCopiar =
          r.estado === "ACTIVA" || r.estado === "INHABILITADA";

        return (
          <RowActions>
            {puedeCopiar && (
              <RowActionButton
                icon={FiCopy}
                label="Copiar"
                colorPalette="green"
                onClick={() => {
                  setRecetaCopiar(r);
                  setErrorCopiar("");
                  setErrorRetomar("");
                }}
              />
            )}
            {puedeEditar && (
              <RowActionButton
                icon={FiEdit2}
                label="Editar"
                colorPalette="blue"
                onClick={() => void editarReceta(r)}
              />
            )}
            <RowActionButton
              icon={FiEye}
              label="Ver"
              colorPalette="yellow"
              onClick={() => setRecetaVer(r)}
            />
            {(r.estado === "BORRADOR" || r.estado === "ACTIVA") && (
              <RowActionButton
                icon={FiTrash2}
                label="Eliminar"
                colorPalette="red"
                onClick={() => {
                  setRecetaEliminar(r);
                  setErrorEliminar("");
                  setErrorRetomar("");
                }}
              />
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <ListadoContainer maxW="6xl">
      <ListadoHeader title="Recetas" icon={FiBookOpen}>
        <HStack justify="flex-end" mb={6} align="center">
          <Button
            variant="solid"
            colorPalette="green"
            onClick={() => setCrearAbierto(true)}
          >
            <FiPlus /> Nueva Receta
          </Button>
        </HStack>
      </ListadoHeader>

      <Box mb={4}>
        <FiltrosBar
          onAplicar={aplicar}
          onLimpiar={limpiar}
          hayFiltrosActivos={hayFiltros}
          loading={loading}
        >
          <FiltroTexto
            ariaLabel="Buscar por código, receta o producto"
            placeholder="Código, nombre o producto..."
            value={borrador.busqueda}
            onChange={(valor) => setBorrador({ ...borrador, busqueda: valor })}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <FiltroSelect
            ariaLabel="Insumo utilizado"
            placeholder="Todos los insumos"
            options={insumos.map((ins) => ({
              label: ins.nombre,
              value: String(ins.id),
            }))}
            value={borrador.insumo_id}
            onChange={(valor) => setBorrador({ ...borrador, insumo_id: valor })}
          />
          <FiltroSelect
            ariaLabel="Equipo utilizado"
            placeholder="Todos los equipos"
            options={equipos.map((eq) => ({
              label: eq.nombre,
              value: String(eq.id),
            }))}
            value={borrador.equipo_id}
            onChange={(valor) => setBorrador({ ...borrador, equipo_id: valor })}
          />
          <FiltroSelect
            ariaLabel="Estado de la receta"
            placeholder="Todos los estados"
            options={[
              { label: "Borrador", value: "BORRADOR" },
              { label: "Activa", value: "ACTIVA" },
              { label: "Inhabilitada", value: "INHABILITADA" },
            ]}
            value={borrador.estado}
            onChange={(valor) => setBorrador({ ...borrador, estado: valor })}
          />
        </FiltrosBar>
      </Box>

      {error && <AlertMessage type="error" message={error} />}
      {errorRetomar && <AlertMessage type="error" message={errorRetomar} />}
      {retomando && (
        <AlertMessage type="info" message="Retomando borrador..." />
      )}

      {loading && <LoadingState message="Cargando recetas..." />}

      {!loading && recetas.length === 0 && (
        <AlertMessage
          type="info"
          message={
            hayAplicados
              ? "No se encontraron recetas con los filtros aplicados."
              : "Todavía no hay recetas cargadas. Para empezar, creá una nueva receta."
          }
        />
      )}

      {!loading && recetas.length > 0 && (
        <>
          <DataTable
            items={itemsPaginados}
            columns={columnas}
            getRowKey={(r) => r.id}
          />
          <TablePagination
            count={recetas.length}
            page={page}
            pageSize={ITEMS_POR_PAGINA}
            onPageChange={setPage}
            labelSingular="receta"
            labelPlural="recetas"
          />
        </>
      )}

      <FormModal open={crearAbierto} onClose={() => setCrearAbierto(false)}>
        <RecetaForm
          modo="crear"
          onCancelar={() => setCrearAbierto(false)}
          onGuardado={guardarReceta}
          enModal
        />
      </FormModal>

      <AlertConfirm
        open={recetaEditar !== null}
        title="Editar receta activa"
        message={
          recetaEditar
            ? `Para editar la receta "${recetaEditar.nombre_receta}" (${recetaEditar.codigo_receta}) se pasará a estado BORRADOR. ¿Continuar?`
            : ""
        }
        loading={pasandoABorrador}
        loadingText="Pasando a borrador..."
        confirmLabel="Continuar"
        error={errorEditar}
        onConfirm={() => void ejecutarPasarABorrador()}
        onCancel={() => {
          setRecetaEditar(null);
          setErrorEditar("");
        }}
      />

      <AlertConfirm
        open={recetaCopiar !== null}
        title="Copiar receta"
        message={
          recetaCopiar
            ? `Se creará un nuevo borrador a partir de la receta "${recetaCopiar.nombre_receta}" (${recetaCopiar.codigo_receta}), con un nuevo código. ¿Continuar?`
            : ""
        }
        loading={copiando}
        loadingText="Copiando..."
        confirmLabel="Copiar"
        error={errorCopiar}
        onConfirm={() => void ejecutarCopiar()}
        onCancel={() => {
          setRecetaCopiar(null);
          setErrorCopiar("");
        }}
      />

      <AlertDelete
        open={recetaEliminar !== null}
        title="Eliminar receta"
        name={recetaEliminar?.nombre_receta ?? null}
        message={
          recetaEliminar
            ? recetaEliminar.estado === "BORRADOR"
              ? `¿Está seguro que desea eliminar el borrador "${recetaEliminar.nombre_receta}" (${recetaEliminar.codigo_receta})? Se eliminará definitivamente.`
              : `¿Está seguro que desea eliminar la receta "${recetaEliminar.nombre_receta}" (${recetaEliminar.codigo_receta})? Al no ser un borrador, se dará de baja lógicamente y quedará en estado INHABILITADA.`
            : ""
        }
        confirmLabel={
          recetaEliminar?.estado === "BORRADOR" ? "Eliminar" : "Dar de baja"
        }
        loadingText="Procesando..."
        loading={eliminando}
        error={errorEliminar}
        onConfirm={() => void ejecutarEliminar()}
        onCancel={() => {
          setRecetaEliminar(null);
          setErrorEliminar("");
        }}
      />

      {recetaVer && (
        <RecetaDetalle
          receta={recetaVer}
          onCerrar={() => setRecetaVer(null)}
        />
      )}
    </ListadoContainer>
  );
}
