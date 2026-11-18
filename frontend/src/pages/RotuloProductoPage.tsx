import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { FiArrowLeft, FiTag } from "react-icons/fi";
import { AlertMessage, LoadingState } from "../components/ui";
import { RotuloProductoForm } from "../features/productos/components/RotuloProductoForm";
import { rotuloProductoApi } from "../features/productos/hooks/rotuloProductoApi";
import type {
  RotuloProductoConsolidado,
  RotuloProductoUpdate,
} from "../features/productos/types";

export default function RotuloProductoPage() {
  const { productoId } = useParams<{ productoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const idNumerico = Number(productoId);

  const origen = (location.state as { from?: string; label?: string } | null)?.from;
  const labelOrigen =
    (location.state as { from?: string; label?: string } | null)?.label ??
    "Productos";

  const [rotulo, setRotulo] = useState<RotuloProductoConsolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

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

  return (
    <Box p={{ base: 4, md: 6 }} bg="gray.100" minH="100vh" w="100%">
      <VStack align="stretch" gap={5} w="100%">
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Button
              variant="outline"
              colorPalette="green"
              onClick={() => navigate(origen || "/productos")}
            >
              <FiArrowLeft /> Volver a {labelOrigen}
            </Button>
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

              <RotuloProductoForm
                rotulo={rotulo}
                guardando={guardando}
                errorGuardar={errorGuardar}
                mensajeExito={mensajeExito}
                onGuardar={handleGuardar}
              />
            </>
          )}
        </VStack>
    </Box>
  );
}
