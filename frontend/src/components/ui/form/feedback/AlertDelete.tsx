import {
  Alert,
  Box,
  Button,
  Dialog,
  HStack,
  Portal,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FiExternalLink, FiTrash2, FiXCircle } from "react-icons/fi";
import type { AsociacionOperativa } from "../data-display/operabilidad";

interface AlertDeleteProps {
  open: boolean;
  title?: string;
  name: string | null;
  message?: string;
  confirmLabel?: string;
  loadingText?: string;
  loading?: boolean;
  error?: string;
  asociaciones?: AsociacionOperativa[];
  mostrarMotivo?: boolean;
  motivo?: string;
  onMotivoChange?: (valor: string) => void;
  advertenciaVencido?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AlertDelete = ({
  open,
  title = "Eliminar",
  name,
  message,
  confirmLabel = "Eliminar",
  loadingText = "Eliminando...",
  loading = false,
  error = "",
  asociaciones = [],
  mostrarMotivo = false,
  motivo = "",
  onMotivoChange,
  advertenciaVencido,
  onConfirm,
  onCancel,
}: AlertDeleteProps) => {
  const navigate = useNavigate();

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {message ? (
                <Text>{message}</Text>
              ) : (
                <Text>
                  ¿Estás seguro que querés dar de baja{" "}
                  <Text as="span" fontWeight="bold" textTransform="capitalize">
                    {name}
                  </Text>
                  ?
                </Text>
              )}

              {advertenciaVencido && !error && (
                <Alert.Root status="warning" mt={3}>
                  <Alert.Indicator />
                  <Alert.Title fontSize="sm">{advertenciaVencido}</Alert.Title>
                </Alert.Root>
              )}

              {mostrarMotivo && !error && onMotivoChange && (
                <Box mt={4}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Motivo de la baja (opcional)
                  </Text>
                  <Textarea
                    size="sm"
                    rows={2}
                    placeholder="Ej. Calibración vencida / fuera de servicio..."
                    value={motivo}
                    onChange={(e) => onMotivoChange(e.target.value)}
                    disabled={loading}
                  />
                </Box>
              )}

              {error && (
                <Alert.Root status="error" mt={4}>
                  <Alert.Indicator />
                  <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
              )}

              {asociaciones.length > 0 && (
                <Box
                  mt={3}
                  p={3}
                  bg="red.50"
                  borderWidth="1px"
                  borderColor="red.200"
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="bold" color="red.800" mb={2}>
                    Asociaciones operativas activas afectadas:
                  </Text>
                  <VStack align="stretch" gap={1.5}>
                    {asociaciones.map((asoc) => (
                      <HStack
                        key={`${asoc.tipo}-${asoc.id}`}
                        justify="space-between"
                        bg="white"
                        p={2}
                        borderRadius="sm"
                        borderWidth="1px"
                        borderColor="red.100"
                        gap={2}
                      >
                        <Box fontSize="xs">
                          <Text fontWeight="semibold" color="gray.800">
                            {asoc.nombre}
                          </Text>
                          {asoc.detalle && (
                            <Text color="gray.600">{asoc.detalle}</Text>
                          )}
                        </Box>
                        {asoc.ruta && (
                          <Button
                            size="2xs"
                            variant="outline"
                            colorPalette="red"
                            onClick={() => {
                              onCancel();
                              navigate(asoc.ruta!);
                            }}
                          >
                            Ver <FiExternalLink />
                          </Button>
                        )}
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap={2}>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  colorPalette="red"
                >
                  <FiXCircle /> Cancelar
                </Button>
                {!error && (
                  <Button
                    colorPalette="red"
                    onClick={onConfirm}
                    loading={loading}
                    loadingText={loadingText}
                  >
                    <FiTrash2 /> {confirmLabel}
                  </Button>
                )}
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};