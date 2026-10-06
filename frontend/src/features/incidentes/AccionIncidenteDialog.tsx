import { useState } from "react";
import { Button, Dialog, Field, Portal, Textarea, NativeSelect } from "@chakra-ui/react";
import type { Incidente } from "./types";

interface Persona { id: number; nombre: string; apellido: string } // ajustalo a tu schema

interface Props {
  incidente: Incidente | null;
  modo: "cierre" | "reapertura";
  personas: Persona[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AccionIncidenteDialog = ({ incidente, modo, personas, onClose, onSuccess }: Props) => {
  const [texto, setTexto] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esCierre = modo === "cierre";
  const valido = texto.trim().length > 0 && responsableId !== "";

  const cerrarDialogo = () => {
    setTexto(""); setResponsableId(""); setError(null);
    onClose();
  };

  const enviar = async () => {
    if (!incidente || !valido) return;
    setEnviando(true);
    setError(null);
    try {
      const body = esCierre
        ? { accion_correctiva: texto.trim(), responsable_cierre_id: Number(responsableId) }
        : { motivo: texto.trim(), responsable_id: Number(responsableId) };

      const res = await fetch(`http://127.0.0.1:8000/incidentes/${incidente.id}/${modo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(typeof err?.detail === "string" ? err.detail : "No se pudo completar la operación.");
      }
      onSuccess();
      cerrarDialogo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog.Root open={!!incidente} onOpenChange={(e) => !e.open && cerrarDialogo()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{esCierre ? "Cerrar incidente" : "Reabrir incidente"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root mb={4}>
                <Field.Label>{esCierre ? "Acción correctiva" : "Motivo de reapertura"}</Field.Label>
                <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} />
              </Field.Root>
              <Field.Root>
                <Field.Label>Responsable</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={responsableId}
                    onChange={(e) => setResponsableId(e.target.value)}
                    placeholder="Seleccioná una persona"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
              {error && <Field.ErrorText mt={3}>{error}</Field.ErrorText>}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
              <Button onClick={enviar} disabled={!valido} loading={enviando}>
                {esCierre ? "Cerrar incidente" : "Reabrir"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};