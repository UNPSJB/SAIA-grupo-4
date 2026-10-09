import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Dialog,
  Portal,
  Textarea,
  Input,
  Alert,
} from "@chakra-ui/react";
import { FiCheck, FiXCircle } from "react-icons/fi";
import { FilePicker } from "../../components/ui/FilePicker";
import type { Equipo } from "./types";

interface RegistrarCalibracionModalProps {
  isOpen: boolean;
  equipo: Equipo | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegistrarCalibracionModal = ({
  isOpen,
  equipo,
  onClose,
  onSuccess,
}: RegistrarCalibracionModalProps) => {
  const [fecha, setFecha] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  if (!isOpen || !equipo) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) {
      setError("La fecha de realización de calibración es obligatoria.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("fecha_calibracion", fecha);
      if (observaciones) formData.append("observaciones", observaciones);
      if (archivo) formData.append("certificado", archivo);

      const res = await fetch(`http://127.0.0.1:8000/equipos/${equipo.id}/calibraciones`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "No se pudo registrar la calibración");
      }

      onSuccess();
      onClose();
      setFecha("");
      setObservaciones("");
      setArchivo(null);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open) onClose(); }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" p={6}>
            <Dialog.Header>
              <Dialog.Title fontSize="lg" fontWeight="bold">
                Registrar Calibración
              </Dialog.Title>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                {equipo.nombre} ({equipo.marca} - {equipo.numero_serie})
              </Text>
            </Dialog.Header>

            <form onSubmit={handleSubmit}>
              <Dialog.Body>
                <VStack gap={4} align="stretch" mt={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Fecha de Realización *
                    </Text>
                    <Input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Observaciones (Opcional)
                    </Text>
                    <Textarea
                      placeholder="Detalles técnicos, laboratorio interviniente..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                    />
                  </Box>

                  <FilePicker onFileSelect={(file) => setArchivo(file)} />

                  {error && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Title fontSize="sm">{error}</Alert.Title>
                    </Alert.Root>
                  )}
                </VStack>
              </Dialog.Body>

              <Dialog.Footer mt={6}>
                <HStack justify="flex-end" gap={2}>
                  <Button variant="outline" colorPalette="red" onClick={onClose} disabled={loading}>
                    <FiXCircle /> Cancelar
                  </Button>
                  <Button colorPalette="green" type="submit" loading={loading}>
                    <FiCheck /> Guardar Calibración
                  </Button>
                </HStack>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};