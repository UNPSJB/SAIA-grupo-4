import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { useAuth } from "../auth/useAuth";
import { recetasApi } from "./hooks/recetaApi";
import { imprimirFichaReceta } from "./utils/imprimirFichaReceta";
import { FichaRecetaPrint } from "./FichaRecetaPrint";
import { TablaComposicionPorcentual } from "./components/TablaComposicionPorcentual";
import { ListaDeclaracionIngredientes } from "./components/ListaDeclaracionIngredientes";
import { ESTADOS_RECETA } from "./constants";
import type {
  ComposicionPorcentualResponse,
  DeclaracionIngredientesResponse,
  PasoReceta,
  Receta,
} from "./types";

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

export interface FichaTecnicaRecetaProps {
  modo?: "admin" | "operador";
}

export const FichaTecnicaReceta = ({ modo }: FichaTecnicaRecetaProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const recetaId = Number(id);
  const { esAdmin } = useAuth();

  // Si no se fuerza el modo, se deduce: si esAdmin o si la URL es /ficha-tecnica
  const esModoAdmin =
    modo != null
      ? modo === "admin"
      : esAdmin || location.pathname.includes("ficha-tecnica");

  const [receta, setReceta] = useState<Receta | null>(null);
  const [composicion, setComposicion] =
    useState<ComposicionPorcentualResponse | null>(null);
  const [declaracion, setDeclaracion] =
    useState<DeclaracionIngredientesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    if (!recetaId || Number.isNaN(recetaId)) {
      setError("ID de receta inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (esModoAdmin) {
        // En modo admin, cargamos la receta, composición porcentual y declaración de ingredientes
        const [dataReceta, dataComp, dataDecl] = await Promise.all([
          recetasApi.obtenerReceta(recetaId),
          recetasApi.obtenerComposicionPorcentual(recetaId).catch(() => null),
          recetasApi.obtenerDeclaracionIngredientes(recetaId).catch(() => null),
        ]);
        setReceta(dataReceta);
        setComposicion(dataComp);
        setDeclaracion(dataDecl);
      } else {
        // En modo operador, consultamos la receta activa
        const dataReceta = await recetasApi.obtenerRecetaActiva(recetaId);
        setReceta(dataReceta);
      }
    } catch (e: any) {
      setError(
        e instanceof Error
          ? e.message
          : esModoAdmin
          ? "No se pudo cargar la información de la ficha técnica."
          : "La receta solicitada no existe o no está activa.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [recetaId, esModoAdmin]);

  const pasosOrdenados = useMemo(() => {
    return [...(receta?.pasos ?? [])].sort(
      (a, b) => a.numero_orden - b.numero_orden,
    );
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

  const handleVolver = () => {
    if (location.state && typeof location.state === "object" && (location.state as any).from) {
      navigate((location.state as any).from);
    } else {
      navigate("/recetas");
    }
  };

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
            onClick={handleVolver}
          >
            <FiArrowLeft /> {esModoAdmin ? "Volver a Recetas" : "Volver al catálogo"}
          </Button>
          <AlertMessage
            type="error"
            message={error || "La receta solicitada no fue encontrada o no está activa."}
          />
        </ListadoContainer>
      </Box>
    );
  }

  const estadoInfo = ESTADOS_RECETA[receta.estado] || {
    texto: receta.estado,
    color: "gray",
  };
  const rendimientoTexto = `${receta.rendimiento_estandar} g`;

  return (
    <>
      <Box
        p={{ base: 4, md: 10 }}
        bg="gray.100"
        minH="100vh"
        className="no-print"
        _print={{ display: "none" }}
      >
        <ListadoContainer maxW="8xl">
          {/* Barra de Navegación Superior */}
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3} mb={3}>
            <Button
              variant="outline"
              colorPalette="green"
              onClick={handleVolver}
            >
              <FiArrowLeft /> {esModoAdmin ? "Volver a Recetas" : "Volver al catálogo"}
            </Button>

            <Button
              colorPalette="blue"
              variant="solid"
              onClick={() => imprimirFichaReceta(receta)}
            >
              <FiPrinter /> Imprimir / Descargar PDF
            </Button>
          </HStack>

          {/* Título de la Receta */}
          <HStack align="baseline" gap={3} flexWrap="wrap" mb={2}>
            <Heading size="2xl" color="green.700">
              {receta.nombre_receta}
            </Heading>
            <Badge colorPalette="teal" fontSize="sm" px={2.5} py={0.5}>
              {receta.codigo_receta}
            </Badge>
          </HStack>

          {/* Chips informativos */}
          <HStack gap={2} mb={4} flexWrap="wrap">
            <Chip
              icon={FiActivity}
              texto={`Estado: ${estadoInfo.texto}`}
              colorPalette={estadoInfo.color}
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

          {/* Composición Porcentual (solo visible en modo administración o si está disponible) */}
          {esModoAdmin && (
            <Box mt={3} mb={6}>
              {composicion ? (
                <TablaComposicionPorcentual composicion={composicion} />
              ) : (
                <AlertMessage
                  type="info"
                  message="No se pudo calcular la composición porcentual de la receta."
                />
              )}
            </Box>
          )}

          {/* Declaración de Ingredientes y Aditivos (solo en modo administración) */}
          {esModoAdmin && declaracion && (
            <Box mt={3} mb={6}>
              <ListaDeclaracionIngredientes
                recetaId={recetaId}
                declaracion={declaracion}
                onDeclaracionChange={setDeclaracion}
              />
            </Box>
          )}

          {/* Resumen General de Insumos y Equipos (solo en modo operador) */}
          {!esModoAdmin && (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={6}>
              {/* Tarjeta de Insumos Generales */}
              <Card.Root variant="outline" bg="white" shadow="xs">
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
              <Card.Root variant="outline" bg="white" shadow="xs">
                <Card.Header pb={2}>
                  <HStack gap={2}>
                    <Icon as={FiTool} color="teal.600" />
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
                          <Badge colorPalette="teal" variant="subtle">
                            x{eq.cantidad}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Card.Body>
              </Card.Root>
            </SimpleGrid>
          )}

          {/* Secuencia Ordenada de Pasos */}
          <Box mt={8}>
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
                      {/* Título del paso */}
                      <HStack gap={2} align="center">
                        <Badge colorPalette="green" size="lg" px={2.5} py={0.5} fontWeight="bold">
                          Paso {paso.numero_orden}
                        </Badge>
                        <Heading size="md" color="gray.800">
                          {paso.titulo}
                        </Heading>
                      </HStack>

                      {/* Instrucciones */}
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
                          <Text
                            fontWeight="bold"
                            color="gray.600"
                            mb={1}
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            <Icon as={FiPackage} /> Insumos del paso:
                          </Text>
                          {paso.insumos && paso.insumos.length > 0 ? (
                            <HStack gap={1.5} flexWrap="wrap">
                              {paso.insumos.map((pi) => (
                                <Badge
                                  key={pi.id}
                                  colorPalette="blue"
                                  variant="outline"
                                  size="sm"
                                >
                                  {pi.insumo?.nombre ?? `Insumo #${pi.insumo_id}`} (
                                  {pi.cantidad_consumo_estimada}{" "}
                                  {pi.insumo?.unidad_medida ?? ""})
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
                          <Text
                            fontWeight="bold"
                            color="gray.600"
                            mb={1}
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            <Icon as={FiTool} /> Equipos del paso:
                          </Text>
                          {paso.equipos && paso.equipos.length > 0 ? (
                            <HStack gap={1.5} flexWrap="wrap">
                              {paso.equipos.map((pe) => (
                                <Badge
                                  key={pe.id}
                                  colorPalette="purple"
                                  variant="outline"
                                  size="sm"
                                >
                                  {pe.equipo?.nombre ?? `Equipo #${pe.equipo_id}`} (x
                                  {pe.cantidad})
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
          </Box>
        </ListadoContainer>
      </Box>

      {/* Componente de Impresión Exclusivo (A4, tema claro) */}
      <FichaRecetaPrint
        receta={receta}
        composicion={composicion}
        declaracion={esModoAdmin ? declaracion : null}
        esModoAdmin={esModoAdmin}
      />
    </>
  );
};
