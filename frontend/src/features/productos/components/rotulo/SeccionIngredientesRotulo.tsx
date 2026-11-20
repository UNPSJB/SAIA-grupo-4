import type { Dispatch, SetStateAction } from "react";
import { Card, Field, Heading, HStack, Icon, Textarea } from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";
import type {
  DatosAutocompletadosReceta,
  RotuloProductoUpdate,
} from "../../types";
import { AvisoSinRecetaActiva, BadgeEstadoRotulo } from "./RotuloSeccionHelpers";

interface SeccionIngredientesRotuloProps {
  form: RotuloProductoUpdate;
  setForm: Dispatch<SetStateAction<RotuloProductoUpdate>>;
  autocompletado: DatosAutocompletadosReceta;
  ingredientesDifiere: boolean;
}

export const SeccionIngredientesRotulo = ({
  form,
  setForm,
  autocompletado,
  ingredientesDifiere,
}: SeccionIngredientesRotuloProps) => (
  <Card.Root variant="outline" bg="white" shadow="xs">
    <Card.Header pb={2}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
        <HStack gap={2}>
          <Icon as={FiFileText} color="teal.600" boxSize={5} />
          <Heading size="md" color="gray.800">
            4. Lista de Ingredientes y Aditivos (Cap. V CAA)
          </Heading>
        </HStack>
        <BadgeEstadoRotulo
          modificado={ingredientesDifiere}
          etiquetaAuto="Sincronizado con receta activa"
          puedeRestaurar={autocompletado.tiene_receta_activa}
          onRestaurar={() =>
            setForm((p) => ({
              ...p,
              lista_ingredientes_texto:
                autocompletado.lista_ingredientes_calculada ?? "",
            }))
          }
        />
      </HStack>
    </Card.Header>
    <Card.Body pt={2} gap={3}>
      {!autocompletado.tiene_receta_activa && <AvisoSinRecetaActiva />}

      <Field.Root>
        <Field.Label fontSize="sm" fontWeight="semibold">
          Texto legal de ingredientes (orden decreciente + aditivos)
        </Field.Label>
        <Textarea
          rows={4}
          value={form.lista_ingredientes_texto ?? ""}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              lista_ingredientes_texto: e.target.value,
            }))
          }
          placeholder="Ingredientes: ..."
        />
        {autocompletado.tiene_receta_activa && autocompletado.receta_codigo && (
          <Field.HelperText fontSize="xs">
            Receta activa de origen: {autocompletado.receta_codigo} —{" "}
            {autocompletado.receta_nombre}. Podés editar este texto manualmente;
            el sistema registrará la modificación.
          </Field.HelperText>
        )}
      </Field.Root>
    </Card.Body>
  </Card.Root>
);
