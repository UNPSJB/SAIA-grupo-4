import type { Dispatch, SetStateAction } from "react";
import {
  Card,
  Checkbox,
  Field,
  Heading,
  HStack,
  Icon,
  Input,
  NativeSelect,
  SimpleGrid,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { FiBox } from "react-icons/fi";
import { formatearFechaISO } from "../../../../utils/fecha";
import type { LoteResumenRotulo, RotuloProductoUpdate } from "../../types";
import { BadgeEstadoRotulo } from "./RotuloSeccionHelpers";

interface SeccionLoteConservacionProps {
  form: RotuloProductoUpdate;
  setForm: Dispatch<SetStateAction<RotuloProductoUpdate>>;
  lotesDisponibles: LoteResumenRotulo[];
  loteRef: LoteResumenRotulo | null;
  loteDifiere: boolean;
}

const formatearVencimientoLote = (fechaIso: string) => {
  const [yyyy, mm, dd] = fechaIso.split("-");
  return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : fechaIso;
};

export const SeccionLoteConservacion = ({
  form,
  setForm,
  lotesDisponibles,
  loteRef,
  loteDifiere,
}: SeccionLoteConservacionProps) => {
  const handleSeleccionarLote = (loteIdStr: string) => {
    if (!loteIdStr) {
      setForm((prev) => ({ ...prev, lote_origen_id: null }));
      return;
    }
    const loteId = Number(loteIdStr);
    const encontrado = lotesDisponibles.find((l) => l.id === loteId);
    if (!encontrado) return;
    setForm((prev) => ({
      ...prev,
      lote_origen_id: encontrado.id,
      codigo_lote_declarado: encontrado.codigo_lote,
      fecha_duracion_minima: formatearVencimientoLote(
        encontrado.fecha_vencimiento,
      ),
    }));
  };

  return (
    <Card.Root variant="outline" bg="white" shadow="xs">
      <Card.Header pb={2}>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Icon as={FiBox} color="teal.600" boxSize={5} />
            <Heading size="md" color="gray.800">
              3. Lote, Duración Mínima, Conservación e Instrucciones
            </Heading>
          </HStack>
          <BadgeEstadoRotulo
            modificado={loteDifiere}
            etiquetaAuto="Sincronizado con lote"
            puedeRestaurar={Boolean(loteRef)}
            onRestaurar={() => {
              if (!loteRef) return;
              setForm((p) => ({
                ...p,
                lote_origen_id: loteRef.id,
                codigo_lote_declarado: loteRef.codigo_lote,
                fecha_duracion_minima: formatearVencimientoLote(
                  loteRef.fecha_vencimiento,
                ),
              }));
            }}
          />
        </HStack>
      </Card.Header>
      <Card.Body pt={2} gap={4}>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          {lotesDisponibles.length > 0 && (
            <Field.Root>
              <Field.Label fontSize="sm" fontWeight="semibold">
                Tomar referencia desde Lote producido
              </Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={form.lote_origen_id ?? ""}
                  onChange={(e) => handleSeleccionarLote(e.target.value)}
                >
                  <option value="">Seleccionar lote...</option>
                  {lotesDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.codigo_lote} (Vto:{" "}
                      {formatearFechaISO(l.fecha_vencimiento)})
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          )}

          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="semibold">
              Identificación del lote
            </Field.Label>
            <Input
              value={form.codigo_lote_declarado ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  codigo_lote_declarado: e.target.value,
                }))
              }
              placeholder="Ej: LOT-GAL-20261118-01"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="semibold">
              Fecha de duración mínima / vencimiento
            </Field.Label>
            <Input
              value={form.fecha_duracion_minima ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  fecha_duracion_minima: e.target.value,
                }))
              }
              placeholder="Ej: 18/05/2027 o Consumir preferentemente..."
            />
          </Field.Root>
        </SimpleGrid>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            Condiciones de conservación
          </Field.Label>
          <Textarea
            rows={2}
            value={form.condiciones_conservacion ?? ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                condiciones_conservacion: e.target.value,
              }))
            }
            placeholder="Ej: Conservar en lugar fresco y seco, al abrigo de la luz solar."
          />
        </Field.Root>

        <VStack align="stretch" gap={3}>
          <Checkbox.Root
            checked={form.aplica_instrucciones_uso}
            onCheckedChange={(details) =>
              setForm((p) => ({
                ...p,
                aplica_instrucciones_uso: Boolean(details.checked),
              }))
            }
            colorPalette="teal"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm">
              El producto requiere instrucciones de uso o preparación
            </Checkbox.Label>
          </Checkbox.Root>

          {form.aplica_instrucciones_uso && (
            <Field.Root>
              <Field.Label fontSize="sm" fontWeight="semibold">
                Instrucciones de uso / preparación
              </Field.Label>
              <Textarea
                rows={3}
                value={form.instrucciones_uso ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, instrucciones_uso: e.target.value }))
                }
                placeholder="Detalle cómo preparar o utilizar el producto..."
              />
            </Field.Root>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};
