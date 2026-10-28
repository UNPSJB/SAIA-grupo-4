import { useEffect, useState } from "react";
import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp, FiClock, FiEye, FiHash } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import { ESTADOS_RECETA } from "./constants";
import { recetasApi } from "./hooks/recetaApi";
import type { PasoReceta, Receta } from "./types";

interface RecetaDetalleProps {
  receta: Receta;
  onCerrar: () => void;
}

const formatearFecha = (fecha?: string) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const PasoDesplegable = ({ paso }: { paso: PasoReceta }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <VStack align="stretch" w="full" minW="0" gap={1}>
      {/* Cabecera */}
      <HStack
        cursor="pointer"
        onClick={() => setAbierto(!abierto)}
        justify="space-between"
        p={2}
        borderRadius="md"
        _hover={{ bg: "gray.100" }}
        userSelect="none"
        w="full"
      >
        <HStack gap={2} minW="0" flex="1">
          <Badge colorPalette="green" flexShrink={0}>Paso {paso.numero_orden}</Badge>
          <Text fontWeight="semibold" fontSize="sm" color="gray.800" wordBreak="break-word" overflowWrap="anywhere">
            {paso.titulo}
          </Text>
        </HStack>
        <HStack gap={2} flexShrink={0}>
          <Text fontSize="xs" color="gray.500">
            {abierto ? "Ocultar detalle" : "Ver detalle"}
          </Text>
          {abierto ? <FiChevronUp /> : <FiChevronDown />}
        </HStack>
      </HStack>

      {/* Detalles desplegables */}
      {abierto && (
        <Box
          p={4}
          w="full"
          minW="0"
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
          boxShadow="sm"
          mt={1}
        >
          <VStack align="stretch" w="full" minW="0" gap={2}>
            {/* Estado */}
            <HStack justify="space-between" borderBottomWidth="1px" pb={1} w="full">
              <Text fontSize="xs" fontWeight="bold" color="gray.500">
                Estado:
              </Text>
              <Badge colorPalette={paso.activo ? "green" : "red"}>
                {paso.activo ? "Activo" : "Inactivo"}
              </Badge>
            </HStack>

            {/* Instrucciones / Procedimiento */}
            <Box borderBottomWidth="1px" pb={2} w="full" minW="0">
              <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                Instrucciones / Procedimiento:
              </Text>
              <Box bg="gray.50" p={2} borderRadius="sm" w="full" minW="0">
                <Text
                  fontSize="sm"
                  color="gray.700"
                  whiteSpace="pre-wrap"
                  wordBreak="break-word"
                  overflowWrap="anywhere"
                  w="full"
                >
                  {paso.instrucciones}
                </Text>
              </Box>
            </Box>

            {/* Recursos requeridos */}
            <VStack align="stretch" gap={1} pt={1} w="full" minW="0">
              <Text fontSize="xs" fontWeight="bold" color="gray.500">
                Recursos requeridos:
              </Text>
              <Text
                fontSize="sm"
                color="gray.700"
                wordBreak="break-word"
                overflowWrap="anywhere"
              >
                • <strong>Insumos teóricos:</strong>{" "}
                {paso.insumos && paso.insumos.length > 0
                  ? paso.insumos
                      .map(
                        (i) =>
                          `${i.insumo?.nombre ?? `Insumo #${i.insumo_id}`} (${i.cantidad_consumo_estimada}${
                            i.insumo?.unidad_medida ? ` ${i.insumo.unidad_medida}` : ""
                          })`,
                      )
                      .join(", ")
                  : "Sin insumos teóricos"}
              </Text>
              <Text
                fontSize="sm"
                color="gray.700"
                wordBreak="break-word"
                overflowWrap="anywhere"
              >
                • <strong>Equipos utilizados:</strong>{" "}
                {paso.equipos && paso.equipos.length > 0
                  ? paso.equipos
                      .map(
                        (e) =>
                          `${e.equipo?.nombre ?? `Equipo #${e.equipo_id}`} (x${e.cantidad})`,
                      )
                      .join(", ")
                  : "Sin equipos asociados"}
              </Text>
            </VStack>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

export const RecetaDetalle = ({ receta, onCerrar }: RecetaDetalleProps) => {
  const estado = ESTADOS_RECETA[receta.estado];
  const [pasos, setPasos] = useState<PasoReceta[]>(() =>
    [...(receta.pasos ?? [])].sort((a, b) => a.numero_orden - b.numero_orden),
  );
  const [cargandoPasos, setCargandoPasos] = useState(
    !receta.pasos || receta.pasos.length === 0,
  );

  useEffect(() => {
    let active = true;
    recetasApi
      .listarPasos(receta.id)
      .then((data) => {
        if (active) {
          const ordenados = [...data].sort(
            (a, b) => a.numero_orden - b.numero_orden,
          );
          setPasos(ordenados);
        }
      })
      .catch(() => {
        // fallback
      })
      .finally(() => {
        if (active) setCargandoPasos(false);
      });

    return () => {
      active = false;
    };
  }, [receta.id]);

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos de la Receta",
      icono: FiClock,
      items: [
        { label: "Código", valor: receta.codigo_receta },
        { label: "Nombre", valor: receta.nombre_receta },
        { label: "Producto ID", valor: receta.producto_id },
        {
          label: "Rendimiento estándar",
          valor: receta.rendimiento_estandar,
        },
        {
          label: "Tiempo estimado total",
          valor:
            receta.tiempo_estimado_total != null
              ? `${receta.tiempo_estimado_total} min`
              : "—",
        },
        {
          label: "Estado",
          valor: <Badge colorPalette={estado.color}>{estado.texto}</Badge>,
        },
        {
          label: "Fecha",
          valor: formatearFecha(receta.fecha_creacion),
        },
        {
          label: "Creado por",
          valor: receta.usuario_creador_nombre || "—",
        },
        {
          label: "Observaciones",
          valor: receta.observaciones || "—",
        },
      ],
    },
    {
      titulo: "Pasos de la Receta",
      icono: FiHash,
      items:
        cargandoPasos && pasos.length === 0
          ? [{ label: "", valor: "Cargando pasos..." }]
          : pasos.length > 0
          ? pasos.map((p) => ({
              label: "",
              valor: <PasoDesplegable key={p.id} paso={p} />,
            }))
          : [{ label: "Pasos", valor: "Sin pasos asociados" }],
    },
  ];

  return (
    <DetalleModal
      open
      title={`Detalle de Receta: ${receta.nombre_receta}`}
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
