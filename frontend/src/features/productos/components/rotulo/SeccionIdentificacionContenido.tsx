import type { Dispatch, SetStateAction } from "react";
import {
  Card,
  Checkbox,
  Field,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";
import { FiTag } from "react-icons/fi";
import type { RotuloProductoUpdate } from "../../types";

interface SeccionIdentificacionContenidoProps {
  form: RotuloProductoUpdate;
  setForm: Dispatch<SetStateAction<RotuloProductoUpdate>>;
  unidadMedidaSimbolo: string;
}

export const SeccionIdentificacionContenido = ({
  form,
  setForm,
  unidadMedidaSimbolo,
}: SeccionIdentificacionContenidoProps) => (
  <Card.Root variant="outline" bg="white" shadow="xs">
    <Card.Header pb={2}>
      <HStack gap={2}>
        <Icon as={FiTag} color="teal.600" boxSize={5} />
        <Heading size="md" color="gray.800">
          1. Denominación de Venta y Contenidos Netos (Cap. V CAA)
        </Heading>
      </HStack>
    </Card.Header>
    <Card.Body pt={2} gap={4}>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            Denominación de venta del alimento
          </Field.Label>
          <Input
            value={form.denominacion_venta ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, denominacion_venta: e.target.value }))
            }
            placeholder="Ej: Galletitas dulces con vainilla"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            Contenido neto
          </Field.Label>
          <Input
            value={form.contenido_neto ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, contenido_neto: e.target.value }))
            }
            placeholder={`Ej: 250 ${unidadMedidaSimbolo || "g"}`}
          />
        </Field.Root>
      </SimpleGrid>

      <VStack align="stretch" gap={3}>
        <Checkbox.Root
          checked={form.aplica_peso_escurrido}
          onCheckedChange={(details) =>
            setForm((p) => ({
              ...p,
              aplica_peso_escurrido: Boolean(details.checked),
            }))
          }
          colorPalette="teal"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">
            Corresponde declarar peso escurrido (productos en medio líquido)
          </Checkbox.Label>
        </Checkbox.Root>

        {form.aplica_peso_escurrido && (
          <Field.Root maxW={{ base: "full", md: "360px" }}>
            <Field.Label fontSize="sm" fontWeight="semibold">
              Peso escurrido
            </Field.Label>
            <Input
              value={form.peso_escurrido ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, peso_escurrido: e.target.value }))
              }
              placeholder="Ej: 180 g"
            />
          </Field.Root>
        )}
      </VStack>
    </Card.Body>
  </Card.Root>
);
