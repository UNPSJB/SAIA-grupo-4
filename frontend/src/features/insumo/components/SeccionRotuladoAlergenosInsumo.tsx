import { Controller, type Control } from "react-hook-form";
import {
  Box,
  Checkbox,
  GridItem,
  HStack,
  SegmentGroup,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiShield } from "react-icons/fi";
import { CATALOGO_ALERGENOS_CAA, type AlergenoInsumoItem } from "../types";
import type { InsumoFormValues } from "../validationSchema";

interface SeccionRotuladoAlergenosInsumoProps {
  control: Control<InsumoFormValues>;
  esModoVer: boolean;
}

export const SeccionRotuladoAlergenosInsumo = ({
  control,
  esModoVer,
}: SeccionRotuladoAlergenosInsumoProps) => {
  return (
    <GridItem colSpan={{ base: 1, md: 2 }}>
      <VStack align='stretch' gap={5} mt={2}>
        <Box
          borderWidth='1px'
          borderColor='gray.200'
          borderRadius='lg'
          p={4}
          bg='gray.50'
        >
          <HStack gap={2} mb={1}>
            <FiShield color='#16a34a' />
            <Text fontWeight='bold' fontSize='md' color='gray.800'>
              Aportes para Rotulado Frontal (Ley 27.642)
            </Text>
          </HStack>
          <Text fontSize='xs' color='gray.600' mb={3}>
            Indicá si este insumo aporta nutrientes críticos agregados o
            sustancias reguladas para la detección automática en recetas.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={2.5}>
            {(
              [
                {
                  name: "aporta_azucares_agregados",
                  label: "Aporta azúcares agregados",
                },
                {
                  name: "aporta_grasas_agregadas",
                  label: "Aporta grasas agregadas",
                },
                {
                  name: "aporta_sodio_agregado",
                  label: "Aporta sodio agregado",
                },
                {
                  name: "es_edulcorante",
                  label: "Es edulcorante",
                },
                {
                  name: "contiene_cafeina",
                  label: "Contiene cafeína",
                },
              ] as const
            ).map((flag) => (
              <Controller
                key={flag.name}
                control={control}
                name={flag.name}
                render={({ field }) => (
                  <Checkbox.Root
                    checked={Boolean(field.value)}
                    onCheckedChange={(details) =>
                      field.onChange(Boolean(details.checked))
                    }
                    disabled={esModoVer}
                    colorPalette='green'
                    size='sm'
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label fontSize='sm'>{flag.label}</Checkbox.Label>
                  </Checkbox.Root>
                )}
              />
            ))}
          </SimpleGrid>
        </Box>

        <Box
          borderWidth='1px'
          borderColor='gray.200'
          borderRadius='lg'
          p={4}
          bg='gray.50'
        >
          <Text fontWeight='bold' fontSize='md' color='gray.800' mb={1}>
            Alérgenos y Cereales Específicos (Art. 235 séptimo CAA)
          </Text>
          <Text fontSize='xs' color='gray.600' mb={3}>
            Indicá si este insumo contiene o es derivado de algún alérgeno mayor
            o cereal específico (trigo, avena, cebada, centeno).
          </Text>
          <Controller
            control={control}
            name='alergenos_declarados_json'
            render={({ field }) => {
              const lista = (field.value ?? []) as AlergenoInsumoItem[];
              return (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={2.5}>
                  {CATALOGO_ALERGENOS_CAA.map((item) => {
                    const encontrado = lista.find(
                      (a) => a.codigo === item.codigo,
                    );
                    const activo = Boolean(encontrado);
                    return (
                      <HStack
                        key={item.codigo}
                        align='center'
                        gap={3}
                        minH='24px'
                      >
                        <Checkbox.Root
                          checked={activo}
                          onCheckedChange={(details) => {
                            if (Boolean(details.checked)) {
                              field.onChange([
                                ...lista,
                                { codigo: item.codigo, es_derivado: false },
                              ]);
                            } else {
                              field.onChange(
                                lista.filter((a) => a.codigo !== item.codigo),
                              );
                            }
                          }}
                          disabled={esModoVer}
                          colorPalette='green'
                          size='sm'
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                          <Checkbox.Label fontSize='sm'>
                            {item.label}
                          </Checkbox.Label>
                        </Checkbox.Root>

                        {activo && (
                          <SegmentGroup.Root
                            size='xs'
                            colorPalette='green'
                            bg='gray.100'
                            value={
                              encontrado?.es_derivado ? "Derivado" : "Directo"
                            }
                            disabled={esModoVer}
                            onValueChange={(details) =>
                              field.onChange(
                                lista.map((a) =>
                                  a.codigo === item.codigo
                                    ? {
                                        ...a,
                                        es_derivado:
                                          details.value === "Derivado",
                                      }
                                    : a,
                                ),
                              )
                            }
                          >
                            <SegmentGroup.Indicator
                              bg='white'
                              borderWidth='1.5px'
                              borderColor='green.600'
                              shadow='xs'
                            />
                            <SegmentGroup.Items
                              items={["Directo", "Derivado"]}
                              _checked={{ color: "green.700", fontWeight: "semibold" }}
                            />
                          </SegmentGroup.Root>
                        )}
                      </HStack>
                    );
                  })}
                </SimpleGrid>
              );
            }}
          />
        </Box>
      </VStack>
    </GridItem>
  );
};
