import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiCopy,
  FiEdit2,
  FiEye,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Badge, Button, HStack } from "@chakra-ui/react";
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
} from "../components/ui";
import { ListadoContainer, ListadoHeader } from "../components/layout";
import { ITEMS_POR_PAGINA } from "../config";
import { RecetaDetalle } from "../features/recetas/RecetaDetalle";
import { RecetaForm } from "../features/recetas/RecetaForm";
import { ESTADOS_RECETA } from "../features/recetas/constants";
import { recetasApi } from "../features/recetas/hooks/recetaApi";
import { useRecetaData } from "../features/recetas/hooks/useRecetaData";
import type { Receta } from "../features/recetas/types";

export default function RecetasPage() {
  const navigate = useNavigate();

  const { loading, error, recetas, recargar } = useRecetaData();
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [page, setPage] = useState(1);

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
    { key: "nombre_receta", label: "Nombre", render: (r) => r.nombre_receta },
    { key: "producto_id", label: "Producto ID", render: (r) => r.producto_id },
    {
      key: "rendimiento_estandar",
      label: "Rendimiento",
      render: (r) => r.rendimiento_estandar,
    },
    {
      key: "fecha_creacion",
      label: "Fecha",
      render: (r) => r.fecha_creacion?.split("T")[0],
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
            {puedeEditar && (
              <RowActionButton
                icon={FiEdit2}
                label="Editar"
                colorPalette="blue"
                onClick={() => void editarReceta(r)}
              />
            )}
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

      {error && <AlertMessage type="error" message={error} />}
      {errorRetomar && <AlertMessage type="error" message={errorRetomar} />}
      {retomando && (
        <AlertMessage type="info" message="Retomando borrador..." />
      )}

      {loading && <LoadingState message="Cargando recetas..." />}

      {!loading && recetas.length === 0 && (
        <AlertMessage
          type="info"
          message="Todavía no hay recetas cargadas. Para empezar, creá una nueva receta."
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
