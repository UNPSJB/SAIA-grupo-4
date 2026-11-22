import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Menu,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiChevronDown,
  FiEdit3,
  FiEye,
  FiFileText,
  FiPrinter,
  FiTag,
} from "react-icons/fi";
import { AlertMessage, LoadingState } from "../components/ui";
import { RotuloProductoForm } from "../features/productos/components/RotuloProductoForm";
import { DocumentoRotuloBorrador } from "../features/productos/components/rotulo/DocumentoRotuloBorrador";
import { RotuloBorradorPrint } from "../features/productos/components/rotulo/RotuloBorradorPrint";
import { RotuloRespaldoPrint } from "../features/productos/components/rotulo/RotuloRespaldoPrint";
import { rotuloProductoApi } from "../features/productos/hooks/rotuloProductoApi";
import type {
  RespaldoCalculoRotulo,
  RotuloProductoConsolidado,
  RotuloProductoUpdate,
  VistaPreviaRotulo,
} from "../features/productos/types";
import { imprimirInforme } from "../utils/imprimirInforme";

type ModoVistaRotulo = "editar" | "previa";
type ModoImpresionRotulo = "borrador" | "respaldo";

export default function RotuloProductoPage() {
  const { productoId } = useParams<{ productoId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const idNumerico = Number(productoId);

  const modoInicial: ModoVistaRotulo =
    searchParams.get("vista") === "previa" ? "previa" : "editar";
  const [modoVista, setModoVista] = useState<ModoVistaRotulo>(modoInicial);

  const [rotulo, setRotulo] = useState<RotuloProductoConsolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaRotulo | null>(
    null,
  );
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState("");

  const [respaldoCalculo, setRespaldoCalculo] =
    useState<RespaldoCalculoRotulo | null>(null);
  const [cargandoRespaldo, setCargandoRespaldo] = useState(false);
  const [modoImpresion, setModoImpresion] =
    useState<ModoImpresionRotulo>("borrador");

  useEffect(() => {
    if (!idNumerico || Number.isNaN(idNumerico)) {
      setErrorCarga("Identificador de producto inválido.");
      setLoading(false);
      return;
    }

    let activo = true;
    setLoading(true);
    setErrorCarga("");

    rotuloProductoApi
      .obtenerRotulo(idNumerico)
      .then((data) => {
        if (activo) setRotulo(data);
      })
      .catch((err: unknown) => {
        if (activo) {
          setErrorCarga(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el rótulo del producto.",
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [idNumerico]);

  const cargarVistaPrevia = useCallback(async () => {
    if (!idNumerico || Number.isNaN(idNumerico)) return;
    setCargandoPreview(true);
    setErrorPreview("");
    try {
      const data = await rotuloProductoApi.obtenerVistaPrevia(idNumerico);
      setVistaPrevia(data);
    } catch (err: unknown) {
      setErrorPreview(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la vista previa del borrador.",
      );
    } finally {
      setCargandoPreview(false);
    }
  }, [idNumerico]);

  useEffect(() => {
    if (modoVista === "previa" && !loading && !errorCarga) {
      void cargarVistaPrevia();
    }
  }, [modoVista, loading, errorCarga, cargarVistaPrevia]);

  const cambiarModoVista = (nuevoModo: ModoVistaRotulo) => {
    setModoVista(nuevoModo);
    const nextParams = new URLSearchParams(searchParams);
    if (nuevoModo === "previa") {
      nextParams.set("vista", "previa");
    } else {
      nextParams.delete("vista");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleGuardar = async (payload: RotuloProductoUpdate) => {
    if (!idNumerico || Number.isNaN(idNumerico)) return;
    setGuardando(true);
    setErrorGuardar("");
    setMensajeExito("");
    try {
      const actualizado = await rotuloProductoApi.guardarRotulo(
        idNumerico,
        payload,
      );
      setRotulo(actualizado);
      setVistaPrevia(null);
      setRespaldoCalculo(null);
      setMensajeExito(
        actualizado.completitud_caa.esta_completo
          ? "Datos del rótulo guardados con completitud normativa del 100%."
          : "Borrador del rótulo guardado correctamente.",
      );
    } catch (err: unknown) {
      setErrorGuardar(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los datos del rótulo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const dispararImpresionTrasRender = (nombreArchivo: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        imprimirInforme(nombreArchivo);
      });
    });
  };

  const handleImprimirBorrador = () => {
    if (!vistaPrevia) return;
    setModoImpresion("borrador");
    dispararImpresionTrasRender(
      `Borrador Rotulo - ${vistaPrevia.producto_nombre}`,
    );
  };

  const handleExportarConRespaldo = async () => {
    if (!idNumerico || Number.isNaN(idNumerico)) return;
    setCargandoRespaldo(true);
    setErrorPreview("");
    try {
      const data = await rotuloProductoApi.obtenerRespaldoCalculo(idNumerico);
      setRespaldoCalculo(data);
      setModoImpresion("respaldo");
      const sufijoReceta = data.codigo_receta_empleada
        ? ` - ${data.codigo_receta_empleada}`
        : "";
      dispararImpresionTrasRender(
        `Respaldo Calculo Rotulo - ${data.producto_nombre}${sufijoReceta}`,
      );
    } catch (err: unknown) {
      setErrorPreview(
        err instanceof Error
          ? err.message
          : "No se pudo generar el expediente de respaldo de cálculo.",
      );
    } finally {
      setCargandoRespaldo(false);
    }
  };

  return (
    <>
      <Box
        className='no-print'
        _print={{ display: "none" }}
        p={{ base: 4, md: 6 }}
        bg='gray.100'
        minH='100vh'
        w='100%'
      >
        <VStack align='stretch' gap={5} w='100%'>
          {loading && <LoadingState message='Cargando datos del rótulo...' />}

          {!loading && errorCarga && (
            <AlertMessage type='error' message={errorCarga} />
          )}

          {!loading && !errorCarga && rotulo && (
            <>
              <HStack
                justify='space-between'
                align='flex-start'
                flexWrap='wrap'
                gap={3}
              >
                <HStack gap={3} align='center' flexWrap='wrap'>
                  <FiTag size={26} color='#2f855a' />
                  <VStack align='start' gap={0.5}>
                    <HStack gap={2.5} align='center' flexWrap='wrap'>
                      <Heading size='xl' color='green.700'>
                        Rótulo Reglamentario — {rotulo.producto_nombre}
                      </Heading>
                      <Badge
                        colorPalette={rotulo.guardado_en_bd ? "teal" : "gray"}
                        variant='subtle'
                        size='md'
                      >
                        {rotulo.guardado_en_bd
                          ? "Rótulo registrado"
                          : "Sin guardar aún"}
                      </Badge>
                    </HStack>
                    <Text fontSize='sm' color='gray.600'>
                      Código Alimentario Argentino (Cap. V) y Ley 27.642 de
                      Promoción de la Alimentación Saludable
                    </Text>
                  </VStack>
                </HStack>

                <VStack align='end' gap={2}>
                  <HStack
                    bg='white'
                    p={1}
                    borderRadius='md'
                    borderWidth='1px'
                    borderColor='gray.200'
                    gap={1}
                  >
                    <Button
                      size='sm'
                      variant={modoVista === "editar" ? "solid" : "ghost"}
                      colorPalette='green'
                      onClick={() => cambiarModoVista("editar")}
                    >
                      <FiEdit3 /> Editar datos
                    </Button>
                    <Button
                      size='sm'
                      variant={modoVista === "previa" ? "solid" : "ghost"}
                      colorPalette='green'
                      onClick={() => cambiarModoVista("previa")}
                    >
                      <FiEye /> Previsualizar borrador
                    </Button>
                  </HStack>

                  {modoVista === "previa" && (
                    <Menu.Root>
                      <Menu.Trigger asChild>
                        <Button
                          size='sm'
                          variant='outline'
                          colorPalette='blue'
                          disabled={
                            !vistaPrevia || cargandoPreview || cargandoRespaldo
                          }
                        >
                          <FiPrinter />
                          {cargandoRespaldo
                            ? "Generando respaldo..."
                            : "Exportar / Imprimir PDF"}
                          <FiChevronDown />
                        </Button>
                      </Menu.Trigger>
                      <Portal>
                        <Menu.Positioner>
                          <Menu.Content minW='270px'>
                            <Menu.Item
                              value='borrador'
                              onSelect={handleImprimirBorrador}
                              disabled={!vistaPrevia || cargandoRespaldo}
                            >
                              <FiPrinter />
                              <Box>
                                <Text fontWeight='medium'>
                                  Imprimir / Guardar borrador PDF
                                </Text>
                                <Text fontSize='xs' color='gray.500'>
                                  Solo maqueta del rótulo (cara informativa y
                                  principal)
                                </Text>
                              </Box>
                            </Menu.Item>
                            <Menu.Item
                              value='respaldo'
                              onSelect={() => void handleExportarConRespaldo()}
                              disabled={!vistaPrevia || cargandoRespaldo}
                            >
                              <FiFileText />
                              <Box>
                                <Text fontWeight='medium'>
                                  Exportar PDF con respaldo de cálculo
                                </Text>
                                <Text fontSize='xs' color='gray.500'>
                                  Maqueta + anexos de receta, composición,
                                  nutrición y sellos
                                </Text>
                              </Box>
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Positioner>
                      </Portal>
                    </Menu.Root>
                  )}
                </VStack>
              </HStack>

              {modoVista === "editar" ? (
                <RotuloProductoForm
                  rotulo={rotulo}
                  guardando={guardando}
                  errorGuardar={errorGuardar}
                  mensajeExito={mensajeExito}
                  onGuardar={handleGuardar}
                />
              ) : (
                <>
                  {cargandoPreview && (
                    <LoadingState message='Generando vista previa consolidada del borrador...' />
                  )}
                  {!cargandoPreview && errorPreview && (
                    <AlertMessage type='error' message={errorPreview} />
                  )}
                  {!cargandoPreview && !errorPreview && vistaPrevia && (
                    <DocumentoRotuloBorrador vistaPrevia={vistaPrevia} />
                  )}
                </>
              )}
            </>
          )}
        </VStack>
      </Box>

      {modoImpresion === "respaldo" && respaldoCalculo ? (
        <RotuloRespaldoPrint respaldo={respaldoCalculo} />
      ) : (
        vistaPrevia && <RotuloBorradorPrint vistaPrevia={vistaPrevia} />
      )}
    </>
  );
}
