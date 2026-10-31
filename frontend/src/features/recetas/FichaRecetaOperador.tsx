import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiArrowLeft,
  FiBox,
  FiClock,
  FiFileText,
  FiHash,
  FiPackage,
  FiPrinter,
  FiTool,
} from "react-icons/fi";

import { AlertMessage, LoadingState } from "../../components/ui";
import { ListadoContainer } from "../../components/layout";
import { recetasApi } from "./hooks/recetaApi";
import { imprimirFichaReceta } from "./utils/imprimirFichaReceta";
import { FichaRecetaPrint } from "./FichaRecetaPrint";
import type { PasoReceta, Receta } from "./types";

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
    variant="subtle"
    px={2.5}
    py={1}
    fontSize="xs"
    borderRadius="md"
    display="inline-flex"
    alignItems="center"
    gap={1.5}
  >
    {icon && <Icon as={icon} />}
    {texto}
  </Badge>
);

export const FichaRecetaOperador = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const recetaId = Number(id);

  const [receta, setReceta] = useState<Receta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!recetaId || Number.isNaN(recetaId)) {
      setError("ID de receta inválido.");
      setLoading(false);
      return;
    }

    let activo = true;
    setLoading(true);
    recetasApi
      .obtenerRecetaActiva(recetaId)
      .then((data) => {
        if (activo) {
          setReceta(data);
          setError("");
        }
      })
      .catch((e) => {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo cargar la ficha técnica de la receta.",
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [recetaId]);

  const pasosOrdenados = useMemo(() => {
    return [...(receta?.pasos ?? [])].sort((a, b) => a.numero_orden - b.numero_orden);
  }, [receta?.pasos]);

  // Consolidación de insumos y equipos para la vista previa general
  const { insumosGenerales, equiposGenerales } = useMemo(() => {
    const insumosMap = new Map<
      number,
      { nombre: string; unidad: string; total: number; pasos: number[] }
    >();
    const equiposMap = new Map<
      number,
      { nombre: string; cantidad: number; pasos: number[] }
    >();

    pasosOrdenados.forEach((paso: PasoReceta) => {
      paso.insumos?.forEach((pi) => {
        const iId = pi.insumo_id;
        const nombre = pi.insumo?.nombre ?? `Insumo #${iId}`;
        const unidad = pi.insumo?.unidad_medida ?? "";
        const cant = Number(pi.cantidad_consumo_estimada) || 0;

        if (!insumosMap.has(iId)) {
          insumosMap.set(iId, {
            nombre,
            unidad,
            total: cant,
            pasos: [paso.numero_orden],
          });
        } else {
          const item = insumosMap.get(iId)!;
          item.total += cant;
          if (!item.pasos.includes(paso.numero_orden)) {
            item.pasos.push(paso.numero_orden);
          }
        }
      });

      paso.equipos?.forEach((pe) => {
        const eId = pe.equipo_id;
        const nombre = pe.equipo?.nombre ?? `Equipo #${eId}`;
        const cant = Number(pe.cantidad) || 1;

        if (!equiposMap.has(eId)) {
          equiposMap.set(eId, {
            nombre,
            cantidad: cant,
            pasos: [paso.numero_orden],
          });
        } else {
          const item = equiposMap.get(eId)!;
          item.cantidad = Math.max(item.cantidad, cant);
          if (!item.pasos.includes(paso.numero_orden)) {
            item.pasos.push(paso.numero_orden);
          }
        }
      });
    });

    return {
      insumosGenerales: Array.from(insumosMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
      equiposGenerales: Array.from(equiposMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
    };
  }, [pasosOrdenados]);

  if (loading) {
    return (
      <Box p={{ base: 4, md: 10 }} bg="gray.100" minH="100vh">
        <LoadingState message="Cargando ficha técnica..." />
      </Box>
    );
  }

  if (error || !receta) {
    return (
      <Box p={{ base: 4, md: 10 }} bg="gray.100" minH="100vh">
        <ListadoContainer maxW="4xl">
          <Button
            variant="outline"
            colorPalette="green"
            mb={4}
            onClick={() => navigate("/recetas")}
          >
            <FiArrowLeft /> Volver al catálogo
          </Button>
          <AlertMessage
            type="error"
            message={error || "La receta solicitada no existe o no está activa."}
          />
        </ListadoContainer>
      </Box>
    );
  }

  const unidadRendimiento = receta.producto?.unidad_medida?.simbolo;
  const rendimientoTexto = unidadRendimiento
    ? `${receta.rendimiento_estandar} ${unidadRendimiento}`
    : `${receta.rendimiento_estandar}`;

  return (
    <>
      <Box
        p={{ base: 4, md: 10 }}
        bg="gray.100"
        minH="100vh"
        className="no-print"
        _print={{ display: "none" }}
      >
      {/* Contenedor Principal: Cabecera y Resumen */}
      <ListadoContainer maxW="8xl">
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3} mb={3}>
          <Button
            variant="outline"
            colorPalette="green"
            onClick={() => navigate("/recetas")}
          >
            <FiArrowLeft /> Volver al catálogo
          </Button>

          <Button
            colorPalette="blue"
            variant="solid"
            onClick={() => imprimirFichaReceta(receta)}
          >
            <FiPrinter /> Imprimir / Descargar PDF
          </Button>
        </HStack>

        <HStack align="baseline" gap={3} flexWrap="wrap" mb={2}>
          <Heading size="2xl" color="green.700">
            {receta.nombre_receta}
          </Heading>
          <Badge colorPalette="teal" fontSize="sm" px={2.5} py={0.5}>
            {receta.codigo_receta}
          </Badge>
        </HStack>

        <HStack gap={2} mb={4} flexWrap="wrap">
          <Chip
            icon={FiActivity}
            texto="Estado: Activa"
            colorPalette="green"
          />
          <Chip
            icon={FiBox}
            texto={`Producto: ${receta.producto?.nombre || receta.producto_id}`}
            colorPalette="purple"
          />
          <Chip
            icon={FiPackage}
            texto={`Rendimiento: ${rendimientoTexto}`}
            colorPalette="blue"
          />
          {receta.tiempo_estimado_total != null && (
            <Chip
              icon={FiClock}
              texto={`Tiempo: ${receta.tiempo_estimado_total} min`}
              colorPalette="orange"
            />
          )}
          <Chip
            icon={FiHash}
            texto={`${pasosOrdenados.length} pasos`}
            colorPalette="gray"
          />
        </HStack>

        {receta.observaciones && (
          <Box
            p={3}
            bg="yellow.50"
            borderLeft="4px solid"
            borderLeftColor="yellow.400"
            borderRadius="md"
            mb={4}
          >
            <Text fontSize="sm" color="gray.800">
              <strong>Observaciones:</strong> {receta.observaciones}
            </Text>
          </Box>
        )}

        {/* Resumen General de Insumos y Equipos */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mt={2}>
          {/* Tarjeta de Insumos Generales */}
          <Card.Root variant="outline" bg="white">
            <Card.Header pb={2}>
              <HStack gap={2}>
                <Icon as={FiPackage} color="blue.600" />
                <Heading size="sm" color="gray.800">
                  Insumos Generales Requeridos
                </Heading>
              </HStack>
            </Card.Header>
            <Card.Body pt={0} gap={2}>
              {insumosGenerales.length === 0 ? (
                <Text fontSize="xs" color="gray.500">
                  No requiere insumos específicos registrados.
                </Text>
              ) : (
                <VStack align="stretch" gap={1.5} divideY="1px" divideColor="gray.100">
                  {insumosGenerales.map((ins, idx) => (
                    <HStack key={idx} justify="space-between" fontSize="sm">
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium" color="gray.800">
                          {ins.nombre}
                        </Text>
                        <Text fontSize="2xs" color="gray.500">
                          Paso{ins.pasos.length > 1 ? "s" : ""}: {ins.pasos.join(", ")}
                        </Text>
                      </VStack>
                      <Badge colorPalette="blue" variant="subtle">
                        {ins.total} {ins.unidad}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Tarjeta de Equipos a Utilizar */}
          <Card.Root variant="outline" bg="white">
            <Card.Header pb={2}>
              <HStack gap={2}>
                <Icon as={FiTool} color="purple.600" />
                <Heading size="sm" color="gray.800">
                  Equipos a Utilizar
                </Heading>
              </HStack>
            </Card.Header>
            <Card.Body pt={0} gap={2}>
              {equiposGenerales.length === 0 ? (
                <Text fontSize="xs" color="gray.500">
                  No requiere equipos registrados.
                </Text>
              ) : (
                <VStack align="stretch" gap={1.5} divideY="1px" divideColor="gray.100">
                  {equiposGenerales.map((eq, idx) => (
                    <HStack key={idx} justify="space-between" fontSize="sm">
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium" color="gray.800">
                          {eq.nombre}
                        </Text>
                        <Text fontSize="2xs" color="gray.500">
                          Paso{eq.pasos.length > 1 ? "s" : ""}: {eq.pasos.join(", ")}
                        </Text>
                      </VStack>
                      <Badge colorPalette="purple" variant="subtle">
                        x{eq.cantidad}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Card.Body>
          </Card.Root>
        </SimpleGrid>
      </ListadoContainer>

      {/* Secuencia Ordenada de Pasos */}
      <ListadoContainer maxW="8xl" mt={6}>
        <HStack gap={2} mb={4}>
          <Icon as={FiFileText} color="green.700" />
          <Heading size="lg" color="green.700">
            Secuencia de Pasos e Instrucciones
          </Heading>
        </HStack>

        {pasosOrdenados.length === 0 ? (
          <AlertMessage
            type="info"
            message="Esta receta no cuenta con pasos registrados."
          />
        ) : (
          <VStack align="stretch" gap={4}>
            {pasosOrdenados.map((paso) => (
              <Card.Root
                key={paso.id}
                variant="outline"
                borderLeft="4px solid"
                borderLeftColor="green.500"
                bg="white"
                shadow="xs"
              >
                <Card.Body gap={3}>
                  {/* Título del paso con badge de número */}
                  <HStack gap={2} align="center">
                    <Badge colorPalette="green" size="lg" px={2.5} py={0.5} fontWeight="bold">
                      Paso {paso.numero_orden}
                    </Badge>
                    <Heading size="md" color="gray.800">
                      {paso.titulo}
                    </Heading>
                  </HStack>

                  {/* Instrucciones de trabajo */}
                  <Box
                    p={3.5}
                    bg="gray.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Text
                      fontSize="sm"
                      color="gray.800"
                      whiteSpace="pre-wrap"
                      lineHeight="1.5"
                    >
                      {paso.instrucciones}
                    </Text>
                  </Box>

                  {/* Recursos requeridos en este paso */}
                  <HStack
                    gap={4}
                    flexWrap="wrap"
                    pt={2}
                    borderTopWidth="1px"
                    borderTopColor="gray.100"
                    fontSize="xs"
                  >
                    <Box flex="1" minW="200px">
                      <Text fontWeight="bold" color="gray.600" mb={1} display="flex" alignItems="center" gap={1}>
                        <Icon as={FiPackage} /> Insumos del paso:
                      </Text>
                      {paso.insumos && paso.insumos.length > 0 ? (
                        <HStack gap={1.5} flexWrap="wrap">
                          {paso.insumos.map((pi) => (
                            <Badge key={pi.id} colorPalette="blue" variant="outline" size="sm">
                              {pi.insumo?.nombre ?? `Insumo #${pi.insumo_id}`} ({pi.cantidad_consumo_estimada} {pi.insumo?.unidad_medida ?? ""})
                            </Badge>
                          ))}
                        </HStack>
                      ) : (
                        <Text color="gray.400" fontStyle="italic">
                          Ninguno
                        </Text>
                      )}
                    </Box>

                    <Box flex="1" minW="200px">
                      <Text fontWeight="bold" color="gray.600" mb={1} display="flex" alignItems="center" gap={1}>
                        <Icon as={FiTool} /> Equipos del paso:
                      </Text>
                      {paso.equipos && paso.equipos.length > 0 ? (
                        <HStack gap={1.5} flexWrap="wrap">
                          {paso.equipos.map((pe) => (
                            <Badge key={pe.id} colorPalette="purple" variant="outline" size="sm">
                              {pe.equipo?.nombre ?? `Equipo #${pe.equipo_id}`} (x{pe.cantidad})
                            </Badge>
                          ))}
                        </HStack>
                      ) : (
                        <Text color="gray.400" fontStyle="italic">
                          Ninguno
                        </Text>
                      )}
                    </Box>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </ListadoContainer>
    </Box>

    {/* Componente de Impresión Exclusivo (A4, tema claro) */}
    <FichaRecetaPrint receta={receta} />
  </>
  );
};
