import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge, Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { FiArrowLeft, FiEdit3, FiEye, FiPrinter, FiTag } from "react-icons/fi";
import { AlertMessage, LoadingState } from "../components/ui";
import { RotuloProductoForm } from "../features/productos/components/RotuloProductoForm";
import { DocumentoRotuloBorrador } from "../features/productos/components/rotulo/DocumentoRotuloBorrador";
import { RotuloBorradorPrint } from "../features/productos/components/rotulo/RotuloBorradorPrint";
import { rotuloProductoApi } from "../features/productos/hooks/rotuloProductoApi";
import type {
  RotuloProductoConsolidado,
  RotuloProductoUpdate,
  VistaPreviaRotulo,
} from "../features/productos/types";
import { imprimirInforme } from "../utils/imprimirInforme";

type ModoVistaRotulo = "editar" | "previa";

export default function RotuloProductoPage() {
  const { productoId } = useParams<{ productoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const idNumerico = Number(productoId);

  const origen = (location.state as { from?: string; label?: string } | null)?.from;
  const labelOrigen =
    (location.state as { from?: string; label?: string } | null)?.label ??
    "Productos";

  const modoInicial: ModoVistaRotulo =
    searchParams.get("vista") === "previa" ? "previa" : "editar";
  const [modoVista, setModoVista] = useState<ModoVistaRotulo>(modoInicial);

  const [rotulo, setRotulo] = useState<RotuloProductoConsolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaRotulo | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState("");

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
    setSearchParams(nextParams, { replace: true, state: location.state });
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

  const handleImprimir = () => {
    if (!vistaPrevia) return;
    imprimirInforme(`Borrador Rotulo - ${vistaPrevia.producto_nombre}`);
  };

  return (
    <>
      <Box
        className="no-print"
        _print={{ display: "none" }}
        p={{ base: 4, md: 6 }}
        bg="gray.100"
        minH="100vh"
        w="100%"
      >
        <VStack align="stretch" gap={5} w="100%">
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Button
              variant="outline"
              colorPalette="green"
              onClick={() => navigate(origen || "/productos")}
            >
              <FiArrowLeft /> Volver a {labelOrigen}
            </Button>

            {!loading && !errorCarga && rotulo && (
              <VStack align="end" gap={2}>
                <HStack
                  bg="white"
                  p={1}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                  gap={1}
                >
                  <Button
                    size="sm"
                    variant={modoVista === "editar" ? "solid" : "ghost"}
                    colorPalette="green"
                    onClick={() => cambiarModoVista("editar")}
                  >
                    <FiEdit3 /> Editar datos
                  </Button>
                  <Button
                    size="sm"
                    variant={modoVista === "previa" ? "solid" : "ghost"}
                    colorPalette="green"
                    onClick={() => cambiarModoVista("previa")}
                  >
                    <FiEye /> Previsualizar borrador
                  </Button>
                </HStack>

                {modoVista === "previa" && (
                  <Button
                    size="sm"
                    variant="solid"
                    colorPalette="blue"
                    onClick={handleImprimir}
                    disabled={!vistaPrevia || cargandoPreview}
                  >
                    <FiPrinter /> Imprimir / Guardar PDF
                  </Button>
                )}
              </VStack>
            )}
          </HStack>

          {loading && <LoadingState message="Cargando datos del rótulo..." />}

          {!loading && errorCarga && (
            <AlertMessage type="error" message={errorCarga} />
          )}

          {!loading && !errorCarga && rotulo && (
            <>
              <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                <HStack gap={3} align="center" flexWrap="wrap">
                  <FiTag size={26} color="#2f855a" />
                  <VStack align="start" gap={0}>
                    <Heading size="xl" color="green.700">
                      Rótulo Reglamentario — {rotulo.producto_nombre}
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Código Alimentario Argentino (Cap. V) y Ley 27.642 de
                      Promoción de la Alimentación Saludable
                    </Text>
                  </VStack>
                </HStack>

                <HStack gap={2}>
                  <Badge
                    colorPalette={rotulo.guardado_en_bd ? "teal" : "gray"}
                    variant="subtle"
                    size="md"
                  >
                    {rotulo.guardado_en_bd ? "Rótulo registrado" : "Sin guardar aún"}
                  </Badge>
                </HStack>
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
                    <LoadingState message="Generando vista previa consolidada del borrador..." />
                  )}
                  {!cargandoPreview && errorPreview && (
                    <AlertMessage type="error" message={errorPreview} />
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

      {vistaPrevia && <RotuloBorradorPrint vistaPrevia={vistaPrevia} />}
    </>
  );
}
