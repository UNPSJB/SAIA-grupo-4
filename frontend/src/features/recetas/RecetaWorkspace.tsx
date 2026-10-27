import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiActivity,
  FiBookOpen,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiList,
  FiPlus,
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
  AlertMessage,
  FormModal,
  LoadingState,
} from "../../components/ui";
import { ListadoContainer } from "../../components/layout";
import { recetasApi } from "./hooks/recetaApi";
import { RecetaForm } from "./RecetaForm";
import type { Receta } from "./types";

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

  const [loading, setLoading] = useState(!initialReceta);
  const [receta, setReceta] = useState<Receta | null>(initialReceta ?? null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modificarAbierto, setModificarAbierto] = useState(false);
  const [activando, setActivando] = useState(false);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  const [confirmarActivar, setConfirmarActivar] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  useEffect(() => {
    if (!initialReceta) return;
    setReceta(initialReceta);
    setLoading(false);
    setError("");
  }, [initialReceta]);

  useEffect(() => {
    if (initialReceta) return;
    if (!recetaId || Number.isNaN(id)) {
      setError("La receta solicitada no es válida.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
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
  const pasos = receta.pasos ?? [];
  const tienePasos = pasos.length > 0;
  const puedeModificar = esBorrador || (esActiva && !receta.tiene_lotes);

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
      <ListadoContainer maxW="6xl">
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
            {esBorrador && (
              <Button
                variant="ghost"
                colorPalette="green"
                disabled={!tienePasos}
                title={
                  !tienePasos
                    ? "Agregá al menos un paso para poder activar la receta."
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
            texto={`Producto: ${receta.producto_id}`}
            colorPalette="purple"
          />
          <Chip
            icon={FiCalendar}
            texto={`Fecha: ${formatFecha(receta.fecha_creacion)}`}
            colorPalette="blue"
          />
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
            {receta.rendimiento_estandar}
          </Dato>
          <Dato label="Tiempo estimado total">
            {receta.tiempo_estimado_total != null
              ? `${receta.tiempo_estimado_total} min`
              : "—"}
          </Dato>
          <Dato label="Observaciones">{receta.observaciones || "—"}</Dato>
        </VStack>

        {esInhabilitada && (
          <AlertMessage
            type="info"
            message="La receta está inhabilitada. Para volver a usarla, copiala desde el listado de recetas."
          />
        )}

        {esBorrador && !tienePasos && (
          <AlertMessage
            type="info"
            message="Agregá al menos un paso para poder activar la receta."
          />
        )}

        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
      </ListadoContainer>

      <ListadoContainer maxW="6xl" mt={4}>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <Heading
            size="lg"
            color="green"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Icon as={FiClock} />
            Pasos de la receta
          </Heading>
        </HStack>

        <Box mt={4}>
          <AlertMessage
            type="info"
            message="Los pasos se agregarán en la siguiente etapa."
          />
        </Box>
      </ListadoContainer>

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
    </Box>
  );
}
