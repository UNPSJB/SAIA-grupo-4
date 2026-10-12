import { useState } from "react";
import { Button, Field, HStack, NativeSelect, Text, Textarea } from "@chakra-ui/react";
import { FiCheckCircle, FiRotateCcw } from "react-icons/fi";
import { FormModal } from "../../components/ui";
import { useIncidentesSubmit } from "./hooks/useIncidentesSubmit";
import type { Incidente } from "./types";
import type { Persona } from "../personal/types"; // ajustá la ruta

interface Props {
  incidente: Incidente;
  modo: "cierre" | "reapertura";
  personas: Persona[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AccionIncidenteDialog = ({
  incidente,
  modo,
  personas,
  onClose,
  onSuccess,
}: Props) => {
  const [texto, setTexto] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [error, setError] = useState("");

  const esCierre = modo === "cierre";
  const valido = texto.trim().length > 0 && responsableId !== "";

  const { submit, isSubmitting } = useIncidentesSubmit({
    endpoint: `http://127.0.0.1:8000/incidentes/${incidente.id}/${modo}`,
    body: esCierre
      ? {
          accion_correctiva: texto.trim(),
          responsable_cierre_id: Number(responsableId),
        }
      : {
          motivo: texto.trim(),
          responsable_id: Number(responsableId),
        },
  });

  const handleConfirmar = async () => {
    if (!valido) return;
    setError("");
    const result = await submit();

    if (result.status === "success") {
      onSuccess();
      onClose();
      return;
    }
    setError(
      result.status === "error"
        ? result.message
        : "No se pudo completar la operación."
    );
  };

  return (
    <FormModal
      open
      showClose
      title={esCierre ? "Cerrar incidente" : "Reabrir incidente"}
      titleIcon={esCierre ? FiCheckCircle : FiRotateCcw}
      onClose={onClose}
    >
      <Field.Root mb={4}>
        <Field.Label>
          {esCierre ? "Acción correctiva" : "Motivo de reapertura"}
        </Field.Label>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={1000}
        />
      </Field.Root>

      <Field.Root mb={4}>
        <Field.Label>Responsable</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={responsableId}
            onChange={(e) => setResponsableId(e.target.value)}
            placeholder="Seleccioná una persona"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>

      {error && (
        <Text color="red.500" fontSize="sm" mb={4}>
          {error}
        </Text>
      )}

      <HStack justify="flex-end" gap={2}>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          colorPalette="green"
          onClick={handleConfirmar}
          disabled={!valido}
          loading={isSubmitting}
        >
          {esCierre ? "Cerrar incidente" : "Reabrir"}
        </Button>
      </HStack>
    </FormModal>
  );
};