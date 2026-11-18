import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiSliders,
} from "react-icons/fi";
import { AlertConfirm } from "../../../components/ui";
import { recetasApi } from "../hooks/recetaApi";
import type {
  AplicabilidadFrontalOut,
  AplicabilidadFrontalUpdate,
} from "../types";

interface EvaluacionAplicabilidadFrontalProps {
  recetaId: number;
  aplicabilidad: AplicabilidadFrontalOut;
  onActualizar: (nueva: AplicabilidadFrontalOut) => void;
  esModoAdmin?: boolean;
  puedeEditarOverrides?: boolean;
  motivoSoloLectura?: string;
}

interface ItemNutrienteRegulado {
  clave: keyof AplicabilidadFrontalUpdate;
  nombre: string;
  descripcion: string;
  valorEfectivo: boolean;
  valorCalculado: boolean;
  override: boolean | null | undefined;
}

export const EvaluacionAplicabilidadFrontal = ({
  recetaId,
  aplicabilidad,
  onActualizar,
  esModoAdmin = true,
  puedeEditarOverrides,
  motivoSoloLectura = "Receta con lotes asociados: solo lectura",
}: EvaluacionAplicabilidadFrontalProps) => {
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");
  const [mostrarDictamen, setMostrarDictamen] = useState(false);
  const moduloDesactivado = aplicabilidad.modulo_octogonos_activo === false;
  const puedeEditar =
    esModoAdmin &&
    !moduloDesactivado &&
    (puedeEditarOverrides ?? aplicabilidad.puede_editar_overrides ?? true);

  // Estado para el modal de confirmación de edición manual
  const [cambioPendiente, setCambioPendiente] = useState<{
    clave: keyof AplicabilidadFrontalUpdate;
    nombre: string;
    nuevoValor: boolean;
    valorCalculado: boolean;
  } | null>(null);

  // Estado para modal de confirmación de restablecer automático
  const [confirmarRestablecer, setConfirmarRestablecer] = useState(false);

  const itemsRegulados: ItemNutrienteRegulado[] = [
    {
      clave: "override_azucares_agregados",
      nombre: "Azúcares agregados",
      descripcion:
        "Azúcares, jarabes, miel o ingredientes con azúcares libres adicionados a la receta.",
      valorEfectivo: aplicabilidad.tiene_azucares_agregados,
      valorCalculado: aplicabilidad.calculado_azucares_agregados,
      override: aplicabilidad.override_azucares_agregados,
    },
    {
      clave: "override_grasas_agregadas",
      nombre: "Grasas agregadas",
      descripcion:
        "Aceites, mantecas, margarinas u otras grasas vegetales/animales adicionadas a la receta.",
      valorEfectivo: aplicabilidad.tiene_grasas_agregadas,
      valorCalculado: aplicabilidad.calculado_grasas_agregadas,
      override: aplicabilidad.override_grasas_agregadas,
    },
    {
      clave: "override_sodio_agregado",
      nombre: "Sodio agregado",
      descripcion:
        "Sal de mesa u otros ingredientes con sales de sodio añadidas durante la elaboración.",
      valorEfectivo: aplicabilidad.tiene_sodio_agregado,
      valorCalculado: aplicabilidad.calculado_sodio_agregado,
      override: aplicabilidad.override_sodio_agregado,
    },
    {
      clave: "override_edulcorantes",
      nombre: "Contiene edulcorantes",
      descripcion:
        "Aditivos edulcorantes naturales o artificiales que aportan sabor dulce.",
      valorEfectivo: aplicabilidad.contiene_edulcorantes,
      valorCalculado: aplicabilidad.calculado_edulcorantes,
      override: aplicabilidad.override_edulcorantes,
    },
    {
      clave: "override_cafeina",
      nombre: "Contiene cafeína",
      descripcion:
        "Extractos o ingredientes con cafeína añadida de forma natural o sintética.",
      valorEfectivo: aplicabilidad.contiene_cafeina,
      valorCalculado: aplicabilidad.calculado_cafeina,
      override: aplicabilidad.override_cafeina,
    },
  ];

  const solicitarCambio = (
    item: ItemNutrienteRegulado,
    nuevoValor: boolean,
  ) => {
    if (!puedeEditar) return;
    setErrorAccion("");
    setCambioPendiente({
      clave: item.clave,
      nombre: item.nombre,
      nuevoValor,
      valorCalculado: item.valorCalculado,
    });
  };

  const confirmarCambio = async () => {
    if (!cambioPendiente) return;
    setLoadingAccion(true);
    setErrorAccion("");
    try {
      const vuelveAlCalculo =
        cambioPendiente.nuevoValor === cambioPendiente.valorCalculado;
      const payload: AplicabilidadFrontalUpdate = {
        [cambioPendiente.clave]: vuelveAlCalculo
          ? null
          : cambioPendiente.nuevoValor,
      };
      const resultado = await recetasApi.actualizarAplicabilidadFrontal(
        recetaId,
        payload,
      );
      onActualizar(resultado);
      setCambioPendiente(null);
    } catch (e: any) {
      setErrorAccion(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el valor manual.",
      );
    } finally {
      setLoadingAccion(false);
    }
  };

  const ejecutarRestablecerAutomatico = async () => {
    setLoadingAccion(true);
    setErrorAccion("");
    try {
      const resultado = await recetasApi.actualizarAplicabilidadFrontal(
        recetaId,
        {
          restablecer_automatico: true,
        },
      );
      onActualizar(resultado);
      setConfirmarRestablecer(false);
    } catch (e: any) {
      setErrorAccion(
        e instanceof Error
          ? e.message
          : "No se pudo restablecer al cálculo automático.",
      );
    } finally {
      setLoadingAccion(false);
    }
  };

  const dictamen = aplicabilidad.dictamen;
  const dictamenLabel = dictamen.replace(/_/g, " ");
  const esAplica = dictamen === "APLICA";
  const esNoAplica = dictamen === "NO_APLICA";

  const bannerColor = esAplica ? "green" : "gray";

  const BannerIcon = esAplica
    ? FiAlertTriangle
    : esNoAplica
      ? FiInfo
      : FiCheckCircle;

  return (
    <Card.Root variant='outline' bg='white' shadow='xs' overflow='hidden'>
      <Card.Header pb={3}>
        <HStack justify='space-between' align='center' flexWrap='wrap' gap={3}>
          <HStack gap={2} align='center' flexWrap='wrap'>
            <Icon as={FiShield} boxSize={5} color='green.600' />
            <Heading size='md' color='gray.800'>
              Evaluación de Aplicabilidad — Rotulado Frontal
            </Heading>
            <Badge colorPalette={bannerColor} variant='subtle' size='sm'>
              {dictamenLabel}
            </Badge>
            <Button
              size='xs'
              variant='ghost'
              colorPalette='black'
              onClick={() => setMostrarDictamen((prev) => !prev)}
              title={`${aplicabilidad.dictamen_titulo}\n${aplicabilidad.motivo}`}
            >
              <Icon as={FiInfo} />
              <Text as='span' fontSize='xs'>
                {mostrarDictamen
                  ? "Ocultar detalle de aplicabilidad"
                  : "Ver detalle de aplicabilidad"}
              </Text>
            </Button>
          </HStack>

          <HStack gap={2} flexWrap='wrap'>
            {aplicabilidad.es_aplicabilidad_forzada_manualmente && (
              <Badge colorPalette='orange' variant='subtle' size='md'>
                <Icon as={FiSliders} mr={1} />
                Corrección manual
              </Badge>
            )}

            {puedeEditar &&
              aplicabilidad.es_aplicabilidad_forzada_manualmente && (
                <Button
                  size='xs'
                  variant='outline'
                  colorPalette='orange'
                  onClick={() => setConfirmarRestablecer(true)}
                  disabled={loadingAccion}
                >
                  <FiRefreshCw size='md' /> Restablecer automático
                </Button>
              )}
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0} gap={4}>
        {/* Banner Informativo del Dictamen de Aplicabilidad (desplegable) */}
        {mostrarDictamen && (
          <Box
            p={3.5}
            borderRadius='md'
            borderWidth='1px'
            borderColor={esAplica ? "blue.200" : "gray.200"} //200
            bg={esAplica ? "blue.50" : "gray.50"}
          >
            <HStack align='start' gap={3}>
              <Icon
                as={BannerIcon}
                boxSize={5}
                color={esAplica ? "blue.600" : "gray.600"}
                mt={0.5}
              />
              <VStack align='start' gap={1} flex='1'>
                <HStack gap={2} flexWrap='wrap'>
                  <Text fontWeight='bold' fontSize='sm' color='black'>
                    {aplicabilidad.dictamen_titulo}
                  </Text>
                </HStack>
                <Text fontSize='sm' color='gray.700'>
                  {aplicabilidad.motivo}
                </Text>
                {esAplica && (
                  <Text
                    fontSize='xs'
                    color='gray.600'
                    fontStyle='italic'
                    mt={0.5}
                  >
                    Corresponde evaluar el cálculo de sellos de advertencia
                    nutricional (octógonos) y leyendas precautorias.
                  </Text>
                )}
              </VStack>
            </HStack>
          </Box>
        )}

        {/* Sección de Checkboxes de Agregados y Sustancias Reguladas */}
        <VStack align='stretch' gap={2}>
          <HStack
            justify='space-between'
            align='center'
            flexWrap='wrap'
            gap={2}
          >
            <Text
              fontSize='xs'
              fontWeight='bold'
              color='gray.700'
              textTransform='uppercase'
            >
              Nutrientes agregados y aditivos de la receta
            </Text>
            {puedeEditar ? (
              <Text fontSize='xs' color='gray.500'>
                Podés hacer clic en un casillero para ajustar manualmente el
                valor con confirmación.
              </Text>
            ) : (
              esModoAdmin && (
                <HStack
                  gap={1}
                  color='gray.500'
                  fontSize='xs'
                  title={
                    moduloDesactivado
                      ? "El módulo de rotulado frontal está desactivado en Configuración del Sistema."
                      : "Para modificar overrides, cloná la receta para generar un nuevo borrador."
                  }
                >
                  <Icon as={FiLock} boxSize={3} />
                  <Text>
                    {moduloDesactivado
                      ? "Módulo de rotulado desactivado en Configuración"
                      : motivoSoloLectura}
                  </Text>
                </HStack>
              )
            )}
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {itemsRegulados.map((item) => {
              const tieneOverride =
                item.override !== null && item.override !== undefined;

              return (
                <Box
                  key={item.clave}
                  p={3}
                  borderRadius='md'
                  borderWidth='1px'
                  opacity={puedeEditar ? 1 : 0.78}
                  transition='all 0.2s'
                >
                  <HStack justify='space-between' align='start' gap={2}>
                    <HStack align='start' gap={2.5} flex='1'>
                      <Checkbox.Root
                        checked={item.valorEfectivo}
                        onCheckedChange={(details) =>
                          solicitarCambio(item, Boolean(details.checked))
                        }
                        disabled={!puedeEditar || loadingAccion}
                        colorPalette='green'
                        mt={0.5}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>

                      <VStack align='start' gap={0.5} flex='1'>
                        <HStack gap={2} flexWrap='wrap' align='center'>
                          <Text
                            fontSize='sm'
                            fontWeight='semibold'
                            color='gray.800'
                            cursor={puedeEditar ? "pointer" : "default"}
                            onClick={() =>
                              puedeEditar &&
                              solicitarCambio(item, !item.valorEfectivo)
                            }
                          >
                            {item.nombre}
                          </Text>
                          {tieneOverride ? (
                            <Badge
                              colorPalette='orange'
                              variant='subtle'
                              size='xs'
                              title='Valor modificado manualmente por un administrador'
                            >
                              Manual
                            </Badge>
                          ) : (
                            <Badge
                              colorPalette={
                                item.valorEfectivo ? "blue" : "gray"
                              }
                              variant='subtle'
                              size='xs'
                              title='Detección automática analizando los insumos y aditivos de la receta'
                            >
                              {item.valorEfectivo
                                ? "Detectado"
                                : "No detectado"}
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize='xs' color='gray.600'>
                          {item.descripcion}
                        </Text>
                      </VStack>
                    </HStack>
                  </HStack>
                </Box>
              );
            })}
          </SimpleGrid>
        </VStack>
        <HStack gap={2} flexWrap='wrap' align='center'>
          <Text fontSize='xs' color='gray.500'>
            {aplicabilidad.version_normativa}
          </Text>
        </HStack>
      </Card.Body>

      {/* Modal de confirmación para cambio manual */}
      {cambioPendiente && (
        <AlertConfirm
          open={Boolean(cambioPendiente)}
          title='Confirmar corrección manual'
          message={`¿Desea cambiar manualmente el estado de "${
            cambioPendiente.nombre
          }" a ${
            cambioPendiente.nuevoValor ? "SÍ (Presente)" : "NO (Ausente)"
          }? Esta acción sobreescribirá la detección automática proveniente de los insumos de la receta.`}
          confirmLabel='Guardar corrección'
          loading={loadingAccion}
          error={errorAccion}
          onConfirm={confirmarCambio}
          onCancel={() => {
            setCambioPendiente(null);
            setErrorAccion("");
          }}
        />
      )}

      {/* Modal de confirmación para restablecer al cálculo automático */}
      <AlertConfirm
        open={confirmarRestablecer}
        title='Restablecer detección automática'
        message='¿Desea restablecer todas las marcas al cálculo automático derivado de los ingredientes y aditivos de la receta? Se descartarán los ajustes manuales guardados.'
        confirmLabel='Restablecer'
        loading={loadingAccion}
        error={errorAccion}
        onConfirm={ejecutarRestablecerAutomatico}
        onCancel={() => {
          setConfirmarRestablecer(false);
          setErrorAccion("");
        }}
      />
    </Card.Root>
  );
};
