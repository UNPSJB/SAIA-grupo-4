import { useState } from "react";
import {
  Dialog,
  Field,
  Input,
  Portal,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { FiCheck, FiXCircle } from "react-icons/fi";
import { BASE_URL } from "../../config";
import { apiFetch } from "../auth/apiFetch";
import { FilePicker } from "../../components/ui/FilePicker";
import {
  FormActions,
  FormContainer,
  FormHeader,
} from "../../components/layout";
import { AlertMessage, CancelButton, SubmitButton } from "../../components/ui";
import type { Equipo } from "./types";

type RegistrarCalibracionFormProps = {
  equipo: Equipo;
  onCancelar?: () => void;
  onGuardado?: () => void;
  /** Sirve igual dentro del modal propio o dentro del modal del tablero. */
  enModal?: boolean;
};

/**
 * Formulario de calibración, sin overlay.
 *
 * Es la implementación única del alta: `RegistrarCalibracionModal` (acá abajo,
 * módulo de equipos) y el tablero de vencimientos la reusan, así la validación y
 * el POST a `POST /equipos/{equipo_id}/calibraciones` quedan en un solo lugar.
 * Usa `apiFetch` para que el certificado viaje con la sesión, igual que el
 * resto de las escrituras del proyecto.
 */
export const RegistrarCalibracionForm = ({
  equipo,
  onCancelar,
  onGuardado,
  enModal = false,
}: RegistrarCalibracionFormProps) => {
  const [fecha, setFecha] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
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

      const res = await apiFetch(
        `${BASE_URL}/equipos/${equipo.id}/calibraciones`,
        { method: "POST", body: formData },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "No se pudo registrar la calibración");
      }

      onGuardado?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al conectar con el servidor",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer modal={enModal}>
      <FormHeader title='Registrar Calibración' icon={FiCheck} />
      <VStack gap={4} align='stretch'>
        <Text fontSize='sm' color='gray.600'>
          {equipo.nombre} ({equipo.marca} - {equipo.numero_serie})
        </Text>

        <Field.Root>
          <Field.Label fontSize='md' fontFamily='sans-serif'>
            Fecha de Realización *
          </Field.Label>
          <Input
            type='date'
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize='md' fontFamily='sans-serif'>
            Observaciones (Opcional)
          </Field.Label>
          <Textarea
            placeholder='Detalles técnicos, laboratorio interviniente...'
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
          />
        </Field.Root>

        <FilePicker onFileSelect={(file) => setArchivo(file)} />

        {error && <AlertMessage type='error' message={error} />}

        <FormActions>
          <SubmitButton
            text='Guardar Calibración'
            icon={FiCheck}
            loading={loading}
            onClick={handleGuardar}
            colorPalette='green'
          />
          <CancelButton
            text='Cancelar'
            icon={FiXCircle}
            onClick={onCancelar}
            colorPalette='red'
            variant='outline'
          />
        </FormActions>
      </VStack>
    </FormContainer>
  );
};

interface RegistrarCalibracionModalProps {
  isOpen: boolean;
  equipo: Equipo | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Overlay del módulo de equipos para registrar una calibración.
 *
 * Solo aporta el Dialog; la lógica y el POST viven en
 * `RegistrarCalibracionForm`, que está en este mismo archivo y que el tablero
 * de vencimientos reusa dentro de su propio modal para la renovación.
 */
export const RegistrarCalibracionModal = ({
  isOpen,
  equipo,
  onClose,
  onSuccess,
}: RegistrarCalibracionModalProps) => {
  if (!isOpen || !equipo) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW='md' p={6}>
            <RegistrarCalibracionForm
              equipo={equipo}
              enModal
              onCancelar={onClose}
              onGuardado={() => {
                onSuccess();
                onClose();
              }}
            />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
