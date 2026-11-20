import type { Dispatch, SetStateAction } from "react";
import {
  Box,
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
import { FiGlobe } from "react-icons/fi";
import type { RotuloProductoUpdate } from "../../types";

interface SeccionOrigenRegistrosProps {
  form: RotuloProductoUpdate;
  setForm: Dispatch<SetStateAction<RotuloProductoUpdate>>;
}

export const SeccionOrigenRegistros = ({
  form,
  setForm,
}: SeccionOrigenRegistrosProps) => (
  <Card.Root variant="outline" bg="white" shadow="xs">
    <Card.Header pb={2}>
      <HStack gap={2}>
        <Icon as={FiGlobe} color="teal.600" boxSize={5} />
        <Heading size="md" color="gray.800">
          2. Identificación del Origen y Registros Sanitarios (RNE / RNPA / RPPA)
        </Heading>
      </HStack>
    </Card.Header>
    <Card.Body pt={2} gap={4}>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            Razón social del elaborador
          </Field.Label>
          <Input
            value={form.razon_social_elaborador ?? ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                razon_social_elaborador: e.target.value,
              }))
            }
            placeholder="Ej: Alimentos SAIA S.A."
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            Domicilio del elaborador
          </Field.Label>
          <Input
            value={form.domicilio_elaborador ?? ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                domicilio_elaborador: e.target.value,
              }))
            }
            placeholder="Calle, número, localidad, provincia"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            País de origen
          </Field.Label>
          <Input
            value={form.pais_origen ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, pais_origen: e.target.value }))
            }
            placeholder="Ej: Argentina"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            RNE del elaborador
          </Field.Label>
          <Input
            value={form.rne_elaborador ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, rne_elaborador: e.target.value }))
            }
            placeholder="Ej: 04-000123"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="semibold">
            RNPA / RPPA (Declaración directa)
          </Field.Label>
          <Input
            value={form.rnpa_rppa ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, rnpa_rppa: e.target.value }))
            }
            placeholder="Ej: 04-055123"
          />
          <Field.HelperText fontSize="xs">
            Carga declarativa del número de registro otorgado al producto.
          </Field.HelperText>
        </Field.Root>
      </SimpleGrid>

      <Box
        p={3.5}
        borderRadius="md"
        borderWidth="1px"
        borderColor={form.es_importado ? "blue.200" : "gray.200"}
        bg={form.es_importado ? "blue.50" : "gray.50"}
      >
        <VStack align="stretch" gap={3}>
          <Checkbox.Root
            checked={form.es_importado}
            onCheckedChange={(details) =>
              setForm((p) => ({
                ...p,
                es_importado: Boolean(details.checked),
              }))
            }
            colorPalette="blue"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm" fontWeight="semibold">
              Producto importado (requiere declarar datos del importador)
            </Checkbox.Label>
          </Checkbox.Root>

          {form.es_importado && (
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Field.Root>
                <Field.Label fontSize="sm" fontWeight="semibold">
                  Nombre / Razón social del importador
                </Field.Label>
                <Input
                  bg="white"
                  value={form.nombre_importador ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      nombre_importador: e.target.value,
                    }))
                  }
                  placeholder="Razón social importadora"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize="sm" fontWeight="semibold">
                  Domicilio del importador
                </Field.Label>
                <Input
                  bg="white"
                  value={form.domicilio_importador ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      domicilio_importador: e.target.value,
                    }))
                  }
                  placeholder="Dirección legal del importador"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontSize="sm" fontWeight="semibold">
                  RNE del importador
                </Field.Label>
                <Input
                  bg="white"
                  value={form.rne_importador ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      rne_importador: e.target.value,
                    }))
                  }
                  placeholder="Ej: 00-009999"
                />
              </Field.Root>
            </SimpleGrid>
          )}
        </VStack>
      </Box>
    </Card.Body>
  </Card.Root>
);
