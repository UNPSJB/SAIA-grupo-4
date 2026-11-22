import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
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
  FiPlus,
  FiPrinter,
  FiRotateCcw,
  FiSliders,
  FiTag,
  FiTool,
} from "react-icons/fi";

import { AlertMessage, FormModal, LoadingState } from "../../components/ui";
import { ListadoContainer } from "../../components/layout";
import { useAuth } from "../auth/useAuth";
import { RegistrarLoteForm } from "../lotes/RegistrarLoteForm";
import { recetasApi } from "./hooks/recetaApi";
import { imprimirFichaReceta } from "./utils/imprimirFichaReceta";
import {
  calcularFactorEscala,
  formatearCantidadEscalada,
} from "./utils/escalarReceta";
import { FichaRecetaPrint } from "./FichaRecetaPrint";
import { TablaComposicionPorcentual } from "./components/TablaComposicionPorcentual";
import { TablaInformacionNutricional } from "./components/TablaInformacionNutricional";
import { ListaDeclaracionIngredientes } from "./components/ListaDeclaracionIngredientes";
import { EvaluacionAplicabilidadFrontal } from "./components/EvaluacionAplicabilidadFrontal";
import { CalculadoraOctogonos } from "./components/CalculadoraOctogonos";
import { ESTADOS_RECETA } from "./constants";
import type {
  AplicabilidadFrontalOut,
  ComposicionPorcentualResponse,
  DeclaracionIngredientesResponse,
  InformacionNutricionalResponse,
  PasoReceta,
  Receta,
  SellosAdvertenciaOut,
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
    variant='subtle'
    px={2.5}
    py={1}
    fontSize='xs'
    borderRadius='md'
    display='inline-flex'
    alignItems='center'
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
  const [infoNutricional, setInfoNutricional] =
    useState<InformacionNutricionalResponse | null>(null);
  const [aplicabilidad, setAplicabilidad] =
    useState<AplicabilidadFrontalOut | null>(null);
  const [sellos, setSellos] = useState<SellosAdvertenciaOut | null>(null);
  const [cantidadObjetivo, setCantidadObjetivo] = useState<string>("");
  const [crearLoteAbierto, setCrearLoteAbierto] = useState(false);
  const [loteCreadoExito, setLoteCreadoExito] = useState(false);
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
        // En modo admin, cargamos la receta, composición porcentual, declaración, información nutricional, aplicabilidad y sellos
        const [
          dataReceta,
          dataComp,
          dataDecl,
          dataNutri,
          dataAplica,
          dataSellos,
        ] = await Promise.all([
          recetasApi.obtenerReceta(recetaId),
          recetasApi.obtenerComposicionPorcentual(recetaId).catch(() => null),
          recetasApi.obtenerDeclaracionIngredientes(recetaId).catch(() => null),
          recetasApi.obtenerInformacionNutricional(recetaId).catch(() => null),
          recetasApi.obtenerAplicabilidadFrontal(recetaId).catch(() => null),
          recetasApi.obtenerSellosAdvertencia(recetaId).catch(() => null),
        ]);
        setReceta(dataReceta);
        setComposicion(dataComp);
        setDeclaracion(dataDecl);
        setInfoNutricional(dataNutri);
        setAplicabilidad(dataAplica);
        setSellos(dataSellos);
      } else {
        // En modo operador, consultamos la receta (ACTIVA o ARCHIVADA)
        const dataReceta = await recetasApi.obtenerRecetaConsultable(recetaId);
        setReceta(dataReceta);
        setCantidadObjetivo(String(dataReceta.rendimiento_estandar));
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

  useEffect(() => {
    if (!loteCreadoExito) return;
    const timer = setTimeout(() => setLoteCreadoExito(false), 4000);
    return () => clearTimeout(timer);
  }, [loteCreadoExito]);

  const pasosOrdenados = useMemo(() => {
    return [...(receta?.pasos ?? [])].sort(
      (a, b) => a.numero_orden - b.numero_orden,
    );
  }, [receta?.pasos]);

  const factorEscala = useMemo(() => {
    if (esModoAdmin || !receta) return 1.0;
    return calcularFactorEscala(cantidadObjetivo, Number(receta.rendimiento_estandar));
  }, [esModoAdmin, receta, cantidadObjetivo]);

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
    if (
      location.state &&
      typeof location.state === "object" &&
      (location.state as any).from
    ) {
      navigate((location.state as any).from);
    } else {
      navigate("/recetas");
    }
  };

  if (loading) {
    return (
      <Box p={{ base: 4, md: 10 }} bg='gray.100' minH='100vh'>
        <LoadingState message='Cargando ficha técnica...' />
      </Box>
    );
  }

  if (error || !receta) {
    return (
      <Box p={{ base: 4, md: 10 }} bg='gray.100' minH='100vh'>
        <ListadoContainer maxW='4xl'>
          <Button
            variant='outline'
            colorPalette='green'
            mb={4}
            onClick={handleVolver}
          >
            <FiArrowLeft />{" "}
            {esModoAdmin ? "Volver a Recetas" : "Volver al catálogo"}
          </Button>
          <AlertMessage
            type='error'
            message={
              error ||
              "La receta solicitada no fue encontrada o no está activa."
            }
          />
        </ListadoContainer>
      </Box>
    );
  }

  const esBorradorIncompleto =
    receta.estado === "BORRADOR" &&
    (pasosOrdenados.length === 0 || Number(receta.rendimiento_estandar) <= 0);

  if (esBorradorIncompleto) {
    return (
      <Box p={{ base: 4, md: 10 }} bg='gray.100' minH='100vh'>
        <ListadoContainer maxW='4xl'>
          <Button
            variant='outline'
            colorPalette='green'
            mb={4}
            onClick={handleVolver}
          >
            <FiArrowLeft />{" "}
            {esModoAdmin ? "Volver a Recetas" : "Volver al catálogo"}
          </Button>
          <AlertMessage
            type='warning'
            message='Para visualizar la ficha técnica de una receta en estado Borrador, debe tener al menos un paso cargado y un rendimiento estándar mayor a 0.'
          />
        </ListadoContainer>
      </Box>
    );
  }

  const estadoInfo = ESTADOS_RECETA[receta.estado] || {
    texto: receta.estado,
    color: "gray",
  };
  const unidadRendimiento = "g";
  const rendimientoTexto = `${receta.rendimiento_estandar} ${unidadRendimiento}`;
  const cantidadObjetivoNum = parseFloat(cantidadObjetivo);
  const cantidadObjetivoInvalida =
    !esModoAdmin && (cantidadObjetivo.trim() === "" || isNaN(cantidadObjetivoNum) || cantidadObjetivoNum <= 0);
  const estaEscalada = !esModoAdmin && Math.abs(factorEscala - 1) > 0.0001;

  return (
    <>
      <Box
        w='100%'
        className='no-print'
        _print={{ display: "none" }}
      >
        {/* Cabecera Superior */}
        <HStack
          justify='space-between'
          align='flex-start'
          flexWrap={{ base: esModoAdmin ? "wrap" : "nowrap", md: "wrap" }}
          gap={3}
          mb={2}
        >
          <HStack align='baseline' gap={2.5} flexWrap='wrap' flex='1' minW={0}>
            <Heading size={{ base: "xl", md: "2xl" }} color='green.700'>
              {receta.nombre_receta}
            </Heading>
            <Badge colorPalette='teal' fontSize='sm' px={2.5} py={0.5}>
              {receta.codigo_receta}
            </Badge>
            <Badge
              colorPalette='gray'
              variant='surface'
              fontSize='sm'
              px={2.5}
              py={0.5}
              fontWeight='semibold'
            >
              v{receta.version}
            </Badge>
          </HStack>

          <HStack gap={2} flexWrap='wrap' flexShrink={0}>
            {esModoAdmin && (
              <Button
                size='sm'
                colorPalette='teal'
                variant='outline'
                onClick={() =>
                  navigate(`/productos/${receta.producto_id}/rotulo`, {
                    state: {
                      from: `/recetas/${receta.id}/ficha-tecnica`,
                      label: "Ficha Técnica",
                      padre: { nombre: "Recetas", to: "/recetas" },
                    },
                  })
                }
              >
                <FiTag /> Completar Rótulo CAA
              </Button>
            )}
            <IconButton
              display={{ base: "inline-flex", md: "none" }}
              aria-label='Imprimir o descargar PDF'
              title='Imprimir o descargar PDF'
              size='sm'
              variant='outline'
              colorPalette='blue'
              onClick={() => imprimirFichaReceta(receta)}
            >
              <FiPrinter />
            </IconButton>
            <Button
              display={{ base: "none", md: "inline-flex" }}
              size='sm'
              colorPalette='blue'
              variant='outline'
              onClick={() => imprimirFichaReceta(receta)}
            >
              <FiPrinter /> Imprimir / Descargar PDF
            </Button>
          </HStack>
        </HStack>

        {!esModoAdmin && loteCreadoExito && (
          <Box mb={3}>
            <AlertMessage
              type='success'
              message='¡Lote de producción registrado exitosamente! Podés consultarlo en la sección Mis Lotes.'
            />
          </Box>
        )}

          {/* Chips informativos */}
          <HStack gap={2} mb={4} flexWrap='wrap'>
            <Chip
              icon={FiActivity}
              texto={`Estado: ${estadoInfo.texto}`}
              colorPalette={estadoInfo.color}
            />
            <Chip
              icon={FiBox}
              texto={`Producto: ${receta.producto?.nombre || receta.producto_id}`}
              colorPalette='purple'
            />
            <Chip
              icon={FiPackage}
              texto={`Rendimiento: ${rendimientoTexto}`}
              colorPalette='blue'
            />
            {receta.tamano_porcion != null && (
              <Chip
                icon={FiActivity}
                texto={`Porción: ${Number(receta.tamano_porcion).toLocaleString("es-AR")} g`}
                colorPalette='teal'
              />
            )}
            {receta.tiempo_estimado_total != null && (
              <Chip
                icon={FiClock}
                texto={`Tiempo: ${receta.tiempo_estimado_total} min`}
                colorPalette='orange'
              />
            )}
            <Chip
              icon={FiHash}
              texto={`${pasosOrdenados.length} pasos`}
              colorPalette='gray'
            />
          </HStack>

          {receta.estado === "ARCHIVADA" && (
            <Box mb={4}>
              <AlertMessage
                type="warning"
                message={`Versión histórica (v${receta.version} — Archivada): esta receta es de solo lectura y no se encuentra vigente para producción.`}
              />
            </Box>
          )}

          {receta.observaciones && (
            <Box
              p={3}
              bg='yellow.50'
              borderLeft='4px solid'
              borderLeftColor='yellow.400'
              borderRadius='md'
              mb={4}
            >
              <Text fontSize='sm' color='gray.800'>
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
                  type='info'
                  message='No se pudo calcular la composición porcentual de la receta.'
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

          {/* Información Nutricional del Producto Terminado (solo en modo administración) */}
          {esModoAdmin && infoNutricional && (
            <Box mt={3} mb={6}>
              <TablaInformacionNutricional informacion={infoNutricional} />
            </Box>
          )}

          {/* Evaluación de Aplicabilidad de Rotulado Frontal (Ley 27.642) */}
          {esModoAdmin && aplicabilidad && (
            <Box mt={3} mb={6}>
              <EvaluacionAplicabilidadFrontal
                recetaId={recetaId}
                aplicabilidad={aplicabilidad}
                onActualizar={(nueva) => {
                  setAplicabilidad(nueva);
                  if (nueva.dictamen === "APLICA") {
                    void recetasApi
                      .obtenerSellosAdvertencia(recetaId)
                      .then(setSellos)
                      .catch(() => setSellos(null));
                  } else {
                    setSellos(null);
                  }
                }}
                esModoAdmin={esModoAdmin}
                puedeEditarOverrides={
                  aplicabilidad.puede_editar_overrides &&
                  (receta.estado === "BORRADOR" ||
                    (receta.estado === "ACTIVA" && !receta.tiene_lotes))
                }
                motivoSoloLectura={
                  receta.estado === "ARCHIVADA"
                    ? "Receta archivada: solo lectura"
                    : "Receta con lotes asociados: solo lectura"
                }
              />
            </Box>
          )}

          {/* Cálculo de Sellos de Advertencia (solo si la aplicabilidad dictamina APLICA) */}
          {esModoAdmin && aplicabilidad?.dictamen === "APLICA" && sellos && (
            <Box mt={3} mb={6}>
              <CalculadoraOctogonos sellosData={sellos} />
            </Box>
          )}

          {/* Selector de cantidad a elaborar y Resumen de Insumos/Equipos (solo en modo operador) */}
          {!esModoAdmin && (
            <>
              {receta.estado === "ACTIVA" && (
              <Card.Root
                variant="outline"
                bg="white"
                shadow="xs"
                mb={4}
                borderColor={estaEscalada ? "green.300" : "gray.200"}
                borderLeft="4px solid"
                borderLeftColor={estaEscalada ? "green.500" : "blue.400"}
              >
                <Card.Body py={3} px={4}>
                  <Flex
                    direction={{ base: "column", md: "row" }}
                    justify="space-between"
                    align={{ base: "stretch", md: "center" }}
                    gap={3}
                  >
                    <VStack align="start" gap={0.5}>
                      <HStack gap={2} wrap="wrap">
                        <Icon as={FiSliders} color="green.600" />
                        <Text fontWeight="bold" fontSize="sm" color="gray.800">
                          Calcular insumos para otra cantidad
                        </Text>
                        <Badge
                          colorPalette="blue"
                          variant="outline"
                          fontSize="xs"
                        >
                          Factor: {factorEscala.toFixed(2)}x
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        Rendimiento estándar de la receta: {rendimientoTexto}. Modificá la cantidad para recalcular los insumos.
                      </Text>
                      {cantidadObjetivoInvalida && (
                        <Text fontSize="xs" color="orange.600" fontWeight="medium">
                          Ingresá una cantidad mayor a 0 para escalar (mostrando valores estándar 1.00x).
                        </Text>
                      )}
                    </VStack>

                    <Flex gap={2} align="center" wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
                      <HStack gap={1.5}>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          size="sm"
                          w={{ base: "110px", sm: "130px" }}
                          textAlign="right"
                          fontWeight="bold"
                          bg="gray.50"
                          value={cantidadObjetivo}
                          onChange={(e) => setCantidadObjetivo(e.target.value)}
                          aria-label="Cantidad a elaborar"
                        />
                        <Badge colorPalette="green" variant="subtle" px={2.5} py={1.5} fontSize="xs">
                          {unidadRendimiento}
                        </Badge>
                      </HStack>

                      <HStack gap={1}>
                        {[0.5, 1, 2].map((mult) => (
                          <Button
                            key={mult}
                            type="button"
                            size="xs"
                            variant="outline"
                            colorPalette="gray"
                            onClick={() =>
                              setCantidadObjetivo(
                                String(
                                  Math.round(Number(receta.rendimiento_estandar) * mult * 100) / 100,
                                ),
                              )
                            }
                          >
                            {mult}x
                          </Button>
                        ))}
                        {(estaEscalada || cantidadObjetivoInvalida) && (
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            colorPalette="green"
                            onClick={() => setCantidadObjetivo(String(receta.rendimiento_estandar))}
                          >
                            <FiRotateCcw />
                            Restablecer
                          </Button>
                        )}
                      </HStack>

                      {receta.estado === "ACTIVA" && (
                        <Button
                          type="button"
                          size="sm"
                          colorPalette="green"
                          variant="solid"
                          w={{ base: "full", sm: "auto" }}
                          onClick={() => {
                            setLoteCreadoExito(false);
                            setCrearLoteAbierto(true);
                          }}
                        >
                          <FiPlus /> Nuevo lote
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                </Card.Body>
              </Card.Root>
              )}

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={6}>
              {/* Tarjeta de Insumos Generales */}
              <Card.Root variant='outline' bg='white' shadow='xs'>
                <Card.Header pb={2}>
                  <HStack gap={2}>
                    <Icon as={FiPackage} color='blue.600' />
                    <Heading size='sm' color='gray.800'>
                      Insumos Generales Requeridos
                    </Heading>
                  </HStack>
                </Card.Header>
                <Card.Body pt={0} gap={2}>
                  {insumosGenerales.length === 0 ? (
                    <Text fontSize='xs' color='gray.500'>
                      No requiere insumos específicos registrados.
                    </Text>
                  ) : (
                    <VStack
                      align='stretch'
                      gap={1.5}
                      divideY='1px'
                      divideColor='gray.100'
                    >
                      {insumosGenerales.map((ins, idx) => (
                        <HStack key={idx} justify='space-between' fontSize='sm'>
                          <VStack align='start' gap={0}>
                            <Text fontWeight='medium' color='gray.800'>
                              {ins.nombre}
                            </Text>
                            <Text fontSize='2xs' color='gray.500'>
                              Paso{ins.pasos.length > 1 ? "s" : ""}:{" "}
                              {ins.pasos.join(", ")}
                            </Text>
                          </VStack>
                          <Badge colorPalette="blue" variant="subtle">
                            {formatearCantidadEscalada(ins.total, factorEscala)} {ins.unidad}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Card.Body>
              </Card.Root>

              {/* Tarjeta de Equipos a Utilizar */}
              <Card.Root variant='outline' bg='white' shadow='xs'>
                <Card.Header pb={2}>
                  <HStack gap={2}>
                    <Icon as={FiTool} color='teal.600' />
                    <Heading size='sm' color='gray.800'>
                      Equipos a Utilizar
                    </Heading>
                  </HStack>
                </Card.Header>
                <Card.Body pt={0} gap={2}>
                  {equiposGenerales.length === 0 ? (
                    <Text fontSize='xs' color='gray.500'>
                      No requiere equipos registrados.
                    </Text>
                  ) : (
                    <VStack
                      align='stretch'
                      gap={1.5}
                      divideY='1px'
                      divideColor='gray.100'
                    >
                      {equiposGenerales.map((eq, idx) => (
                        <HStack key={idx} justify='space-between' fontSize='sm'>
                          <VStack align='start' gap={0}>
                            <Text fontWeight='medium' color='gray.800'>
                              {eq.nombre}
                            </Text>
                            <Text fontSize='2xs' color='gray.500'>
                              Paso{eq.pasos.length > 1 ? "s" : ""}:{" "}
                              {eq.pasos.join(", ")}
                            </Text>
                          </VStack>
                          <Badge colorPalette='teal' variant='subtle'>
                            x{eq.cantidad}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Card.Body>
              </Card.Root>
            </SimpleGrid>
            </>
          )}

          {/* Secuencia Ordenada de Pasos */}
          <Box mt={8}>
            <HStack gap={2} mb={4}>
              <Icon as={FiFileText} color='green.700' />
              <Heading size='lg' color='green.700'>
                Secuencia de Pasos e Instrucciones
              </Heading>
            </HStack>

            {pasosOrdenados.length === 0 ? (
              <AlertMessage
                type='info'
                message='Esta receta no cuenta con pasos registrados.'
              />
            ) : (
              <VStack align='stretch' gap={4}>
                {pasosOrdenados.map((paso) => (
                  <Card.Root
                    key={paso.id}
                    variant='outline'
                    borderLeft='4px solid'
                    borderLeftColor='green.500'
                    bg='white'
                    shadow='xs'
                  >
                    <Card.Body gap={3}>
                      {/* Título del paso */}
                      <HStack gap={2} align='center'>
                        <Badge
                          colorPalette='green'
                          size='lg'
                          px={2.5}
                          py={0.5}
                          fontWeight='bold'
                        >
                          Paso {paso.numero_orden}
                        </Badge>
                        <Heading size='md' color='gray.800'>
                          {paso.titulo}
                        </Heading>
                      </HStack>

                      {/* Instrucciones */}
                      <Box
                        p={3.5}
                        bg='gray.50'
                        borderRadius='md'
                        borderWidth='1px'
                        borderColor='gray.200'
                      >
                        <Text
                          fontSize='sm'
                          color='gray.800'
                          whiteSpace='pre-wrap'
                          lineHeight='1.5'
                        >
                          {paso.instrucciones}
                        </Text>
                      </Box>

                      {/* Recursos requeridos en este paso */}
                      <HStack
                        gap={4}
                        flexWrap='wrap'
                        pt={2}
                        borderTopWidth='1px'
                        borderTopColor='gray.100'
                        fontSize='xs'
                      >
                        <Box flex='1' minW='200px'>
                          <Text
                            fontWeight='bold'
                            color='gray.600'
                            mb={1}
                            display='flex'
                            alignItems='center'
                            gap={1}
                          >
                            <Icon as={FiPackage} /> Insumos del paso:
                          </Text>
                          {paso.insumos && paso.insumos.length > 0 ? (
                            <HStack gap={1.5} flexWrap='wrap'>
                              {paso.insumos.map((pi) => (
                                <Badge
                                  key={pi.id}
                                  colorPalette='blue'
                                  variant='outline'
                                  size='sm'
                                >
                                  {pi.insumo?.nombre ?? `Insumo #${pi.insumo_id}`} (
                                  {!esModoAdmin
                                    ? formatearCantidadEscalada(
                                        Number(pi.cantidad_consumo_estimada) || 0,
                                        factorEscala,
                                      )
                                    : pi.cantidad_consumo_estimada}{" "}
                                  {pi.insumo?.unidad_medida ?? ""})
                                </Badge>
                              ))}
                            </HStack>
                          ) : (
                            <Text color='gray.400' fontStyle='italic'>
                              Ninguno
                            </Text>
                          )}
                        </Box>

                        <Box flex='1' minW='200px'>
                          <Text
                            fontWeight='bold'
                            color='gray.600'
                            mb={1}
                            display='flex'
                            alignItems='center'
                            gap={1}
                          >
                            <Icon as={FiTool} /> Equipos del paso:
                          </Text>
                          {paso.equipos && paso.equipos.length > 0 ? (
                            <HStack gap={1.5} flexWrap='wrap'>
                              {paso.equipos.map((pe) => (
                                <Badge
                                  key={pe.id}
                                  colorPalette='purple'
                                  variant='outline'
                                  size='sm'
                                >
                                  {pe.equipo?.nombre ??
                                    `Equipo #${pe.equipo_id}`}{" "}
                                  (x
                                  {pe.cantidad})
                                </Badge>
                              ))}
                            </HStack>
                          ) : (
                            <Text color='gray.400' fontStyle='italic'>
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
      </Box>

      {/* Componente de Impresión Exclusivo (A4, tema claro) */}
      <FichaRecetaPrint
        receta={receta}
        composicion={composicion}
        declaracion={esModoAdmin ? declaracion : null}
        infoNutricional={esModoAdmin ? infoNutricional : null}
        aplicabilidad={esModoAdmin ? aplicabilidad : null}
        sellos={
          esModoAdmin && aplicabilidad?.dictamen === "APLICA" ? sellos : null
        }
        esModoAdmin={esModoAdmin}
        factorEscala={factorEscala}
        cantidadObjetivo={
          !esModoAdmin && !cantidadObjetivoInvalida ? cantidadObjetivoNum : null
        }
      />
      {/* Modal de Registro de Lote precargado desde la Ficha Técnica (Operador) */}
      {!esModoAdmin && crearLoteAbierto && (
        <FormModal
          open={crearLoteAbierto}
          onClose={() => setCrearLoteAbierto(false)}
          showClose
        >
          <RegistrarLoteForm
            productoIdInicial={receta.producto_id}
            masaTandaInicial={
              !cantidadObjetivoInvalida
                ? cantidadObjetivoNum
                : Number(receta.rendimiento_estandar)
            }
            onSuccess={() => {
              setCrearLoteAbierto(false);
              setLoteCreadoExito(true);
            }}
            onCancelar={() => setCrearLoteAbierto(false)}
          />
        </FormModal>
      )}
    </>
  );
};
