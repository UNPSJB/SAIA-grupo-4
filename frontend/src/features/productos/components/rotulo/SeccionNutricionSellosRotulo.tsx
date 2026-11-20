import type { Dispatch, SetStateAction } from "react";
import {
  Box,
  Card,
  Checkbox,
  Field,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiActivity, FiOctagon } from "react-icons/fi";
import {
  LeyendaRectangular,
  OctogonoReglamentario,
} from "../../../recetas/components/SellosGraficos";
import type {
  DatosAutocompletadosReceta,
  FilaNutricionalRotuloItem,
  RotuloProductoUpdate,
  SelloRotuloItem,
} from "../../types";
import { AvisoSinRecetaActiva, BadgeEstadoRotulo } from "./RotuloSeccionHelpers";

const CATALOGO_SELLOS: SelloRotuloItem[] = [
  { codigo: "EXCESO_AZUCARES", texto: "EXCESO EN AZÚCARES" },
  { codigo: "EXCESO_GRASAS_TOTALES", texto: "EXCESO EN GRASAS TOTALES" },
  { codigo: "EXCESO_GRASAS_SATURADAS", texto: "EXCESO EN GRASAS SATURADAS" },
  { codigo: "EXCESO_SODIO", texto: "EXCESO EN SODIO" },
  { codigo: "EXCESO_CALORIAS", texto: "EXCESO EN CALORÍAS" },
];

const CATALOGO_LEYENDAS: SelloRotuloItem[] = [
  {
    codigo: "CONTIENE_EDULCORANTES",
    texto: "CONTIENE EDULCORANTES, NO RECOMENDABLE EN NIÑOS/AS",
  },
  {
    codigo: "CONTIENE_CAFEINA",
    texto: "CONTIENE CAFEÍNA. EVITAR EN NIÑOS/AS",
  },
];

interface SeccionNutricionSellosRotuloProps {
  form: RotuloProductoUpdate;
  setForm: Dispatch<SetStateAction<RotuloProductoUpdate>>;
  autocompletado: DatosAutocompletadosReceta;
  nutricionDifiere: boolean;
  sellosDifieren: boolean;
}

export const SeccionNutricionSellosRotulo = ({
  form,
  setForm,
  autocompletado,
  nutricionDifiere,
  sellosDifieren,
}: SeccionNutricionSellosRotuloProps) => {
  const actualizarCeldaNutricion = (
    idx: number,
    campo: keyof Pick<
      FilaNutricionalRotuloItem,
      "valor_100g" | "valor_porcion" | "porcentaje_vd"
    >,
    valor: string,
  ) => {
    setForm((prev) => {
      const copia = [...(prev.tabla_nutricional_json ?? [])];
      copia[idx] = { ...copia[idx], [campo]: valor };
      return { ...prev, tabla_nutricional_json: copia };
    });
  };

  const toggleItem = (
    campo: "sellos_advertencia_json" | "leyendas_precautorias_json",
    item: SelloRotuloItem,
  ) => {
    setForm((prev) => {
      const actuales = prev[campo] ?? [];
      const existe = actuales.some((x) => x.codigo === item.codigo);
      return {
        ...prev,
        [campo]: existe
          ? actuales.filter((x) => x.codigo !== item.codigo)
          : [...actuales, item],
      };
    });
  };

  return (
    <Card.Root variant="outline" bg="white" shadow="xs">
      <Card.Header pb={2}>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Icon as={FiActivity} color="teal.600" boxSize={5} />
            <Heading size="md" color="gray.800">
              5. Información Nutricional y Rotulado Frontal (Ley 27.642)
            </Heading>
          </HStack>
          <BadgeEstadoRotulo
            modificado={nutricionDifiere}
            etiquetaAuto="Nutrición sincronizada con receta activa"
            puedeRestaurar={autocompletado.tiene_receta_activa}
            onRestaurar={() =>
              setForm((p) => ({
                ...p,
                tamano_porcion_declarado:
                  autocompletado.tamano_porcion_calculado ?? "",
                leyenda_vd_declarada: autocompletado.leyenda_vd_calculada ?? "",
                tabla_nutricional_json:
                  autocompletado.tabla_nutricional_calculada.map((f) => ({
                    ...f,
                  })),
              }))
            }
          />
        </HStack>
      </Card.Header>
      <Card.Body pt={2} gap={5}>
        {!autocompletado.tiene_receta_activa && <AvisoSinRecetaActiva />}

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="semibold">
              Tamaño de la porción declarada
            </Field.Label>
            <Input
              value={form.tamano_porcion_declarado ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  tamano_porcion_declarado: e.target.value,
                }))
              }
              placeholder="Ej: 50 g (3 unidades)"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="semibold">
              Leyenda de Valor Diario (% VD)
            </Field.Label>
            <Input
              value={form.leyenda_vd_declarada ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  leyenda_vd_declarada: e.target.value,
                }))
              }
              placeholder="(*) % Valores Diarios con base a una dieta de 2.000 kcal..."
            />
          </Field.Root>
        </SimpleGrid>

        {(form.tabla_nutricional_json?.length ?? 0) > 0 ? (
          <Box
            overflowX="auto"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
          >
            <Table.Root size="sm" variant="line">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader fontWeight="bold" color="gray.700">
                    Nutriente
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="bold" color="gray.700">
                    Cada 100 g / ml
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="bold" color="gray.700">
                    Por porción
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="bold" color="gray.700">
                    % VD
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(form.tabla_nutricional_json ?? []).map((fila, idx) => (
                  <Table.Row key={fila.codigo_nutriente}>
                    <Table.Cell
                      pl={fila.nivel_indentacion === 0 ? 3 : 7}
                      fontSize="sm"
                      fontWeight={
                        fila.nivel_indentacion === 0 ? "semibold" : "normal"
                      }
                    >
                      {fila.nombre_etiqueta} ({fila.unidad})
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        size="xs"
                        value={fila.valor_100g ?? ""}
                        onChange={(e) =>
                          actualizarCeldaNutricion(
                            idx,
                            "valor_100g",
                            e.target.value,
                          )
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        size="xs"
                        value={fila.valor_porcion ?? ""}
                        onChange={(e) =>
                          actualizarCeldaNutricion(
                            idx,
                            "valor_porcion",
                            e.target.value,
                          )
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        size="xs"
                        value={fila.porcentaje_vd ?? ""}
                        onChange={(e) =>
                          actualizarCeldaNutricion(
                            idx,
                            "porcentaje_vd",
                            e.target.value,
                          )
                        }
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Text fontSize="sm" color="gray.500" fontStyle="italic">
            No hay filas de tabla nutricional cargadas todavía.
          </Text>
        )}

        {/* Sub-bloque Sellos y Leyendas Precautorias */}
        <Box
          p={4}
          bg="gray.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <VStack align="stretch" gap={4}>
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
              <HStack gap={2}>
                <Icon as={FiOctagon} color="gray.800" boxSize={4} />
                <Text fontWeight="bold" fontSize="sm" color="gray.800">
                  Sellos de Advertencia y Leyendas Precautorias (Ley 27.642)
                </Text>
              </HStack>
              <BadgeEstadoRotulo
                modificado={sellosDifieren}
                etiquetaAuto="Sellos sincronizados con receta activa"
                puedeRestaurar={autocompletado.tiene_receta_activa}
                onRestaurar={() =>
                  setForm((p) => ({
                    ...p,
                    sellos_advertencia_json: autocompletado.sellos_calculados.map(
                      (s) => ({ ...s }),
                    ),
                    leyendas_precautorias_json:
                      autocompletado.leyendas_calculadas.map((l) => ({ ...l })),
                  }))
                }
              />
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <VStack align="start" gap={2}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="gray.600"
                  textTransform="uppercase"
                >
                  Octógonos declarados en el rótulo
                </Text>
                {CATALOGO_SELLOS.map((item) => {
                  const marcado = (form.sellos_advertencia_json ?? []).some(
                    (s) => s.codigo === item.codigo,
                  );
                  return (
                    <Checkbox.Root
                      key={item.codigo}
                      checked={marcado}
                      onCheckedChange={() =>
                        toggleItem("sellos_advertencia_json", item)
                      }
                      colorPalette="gray"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="xs">
                        {item.texto}
                      </Checkbox.Label>
                    </Checkbox.Root>
                  );
                })}
              </VStack>

              <VStack align="start" gap={2}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="gray.600"
                  textTransform="uppercase"
                >
                  Leyendas precautorias
                </Text>
                {CATALOGO_LEYENDAS.map((item) => {
                  const marcado = (form.leyendas_precautorias_json ?? []).some(
                    (l) => l.codigo === item.codigo,
                  );
                  return (
                    <Checkbox.Root
                      key={item.codigo}
                      checked={marcado}
                      onCheckedChange={() =>
                        toggleItem("leyendas_precautorias_json", item)
                      }
                      colorPalette="gray"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="xs">
                        {item.texto}
                      </Checkbox.Label>
                    </Checkbox.Root>
                  );
                })}
              </VStack>
            </SimpleGrid>

            {((form.sellos_advertencia_json?.length ?? 0) > 0 ||
              (form.leyendas_precautorias_json?.length ?? 0) > 0) && (
              <Box pt={2} borderTopWidth="1px" borderColor="gray.200">
                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2}>
                  Vista previa en rótulo:
                </Text>
                <Flex gap={3} flexWrap="wrap" align="center">
                  {(form.sellos_advertencia_json ?? []).map((s) => (
                    <OctogonoReglamentario
                      key={s.codigo}
                      codigo={s.codigo}
                      texto={s.texto}
                    />
                  ))}
                  {(form.leyendas_precautorias_json ?? []).map((l) => (
                    <LeyendaRectangular
                      key={l.codigo}
                      codigo={l.codigo}
                      texto={l.texto}
                    />
                  ))}
                </Flex>
              </Box>
            )}
          </VStack>
        </Box>
      </Card.Body>
    </Card.Root>
  );
};
