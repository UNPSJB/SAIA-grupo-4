import type { Dispatch, SetStateAction } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Field,
  Heading,
  HStack,
  Icon,
  Input,
  SegmentGroup,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiShield,
  FiThermometer,
} from "react-icons/fi";
import { formatearFechaISO } from "../../../../utils/fecha";
import {
  CATALOGO_ALERGENOS_CAA,
  type CodigoAlergenoCAA,
} from "../../../insumo/types";
import type {
  AlergenoRotuloItem,
  DatosAutocompletadosReceta,
  EstadoValidacionAlergenos,
  RotuloProductoUpdate,
} from "../../types";
import {
  AvisoSinRecetaActiva,
  BadgeEstadoRotulo,
} from "./RotuloSeccionHelpers";

const ETIQUETAS_MAP: Record<CodigoAlergenoCAA, string> = Object.fromEntries(
  CATALOGO_ALERGENOS_CAA.map((c) => [
    c.codigo,
    c.codigo === "DIOXIDO_AZUFRE_SULFITOS" ? "SULFITOS" : c.label,
  ]),
) as Record<CodigoAlergenoCAA, string>;

const unirConY = (etiquetas: string[]): string => {
  if (etiquetas.length === 0) return "";
  if (etiquetas.length === 1) return etiquetas[0];
  const ultima = etiquetas[etiquetas.length - 1];
  const conj = /^(I|HI|Í)/.test(ultima) ? " E " : " Y ";
  if (etiquetas.length === 2) return `${etiquetas[0]}${conj}${ultima}`;
  return `${etiquetas.slice(0, -1).join(", ")}${conj}${ultima}`;
};

const redactarClausula = (
  prefijo: string,
  items: AlergenoRotuloItem[],
): string | null => {
  if (items.length === 0) return null;
  const directos: string[] = [];
  const derivados: string[] = [];
  const vistosD = new Set<CodigoAlergenoCAA>();
  const vistosDer = new Set<CodigoAlergenoCAA>();

  for (const it of items) {
    const etq = ETIQUETAS_MAP[it.codigo] ?? it.codigo;
    if (!it.es_derivado) {
      if (!vistosD.has(it.codigo)) {
        vistosD.add(it.codigo);
        directos.push(etq);
      }
    } else if (!vistosDer.has(it.codigo) && !vistosD.has(it.codigo)) {
      vistosDer.add(it.codigo);
      derivados.push(etq);
    }
  }

  if (directos.length > 0 && derivados.length > 0) {
    return `${prefijo} ${unirConY(directos)} Y DERIVADOS DE ${unirConY(derivados)}.`;
  }
  if (directos.length > 0) {
    return `${prefijo} ${unirConY(directos)}.`;
  }
  if (derivados.length > 0) {
    return `${prefijo} DERIVADOS DE ${unirConY(derivados)}.`;
  }
  return null;
};

export const generarLeyendaAlergenosLocal = (
  presentes: AlergenoRotuloItem[],
  cruzada: AlergenoRotuloItem[],
): string => {
  const codsPresentes = new Set(presentes.map((p) => p.codigo));
  const cruzadaFiltrada = cruzada.filter((c) => !codsPresentes.has(c.codigo));
  return [
    redactarClausula("CONTIENE", presentes),
    redactarClausula("PUEDE CONTENER", cruzadaFiltrada),
  ]
    .filter(Boolean)
    .join(" ");
};

interface SeccionAlergenosConservacionProps {
  form: RotuloProductoUpdate;
  setForm: Dispatch<SetStateAction<RotuloProductoUpdate>>;
  autocompletado: DatosAutocompletadosReceta;
  alergenosDifiere: boolean;
  conservacionDifiere: boolean;
  estadoValidacion: EstadoValidacionAlergenos;
  confirmacionInvalidada: boolean;
  confirmadoPorNombre?: string | null;
  fechaConfirmacion?: string | null;
  confirmacionMarcadaEnForm: boolean;
  onMarcarConfirmacion: () => void;
}

export const SeccionAlergenosConservacion = ({
  form,
  setForm,
  autocompletado,
  alergenosDifiere,
  conservacionDifiere,
  estadoValidacion,
  confirmacionInvalidada,
  confirmadoPorNombre,
  fechaConfirmacion,
  confirmacionMarcadaEnForm,
  onMarcarConfirmacion,
}: SeccionAlergenosConservacionProps) => {
  const presentes = form.alergenos_presentes_json ?? [];
  const cruzada = form.alergenos_contaminacion_cruzada_json ?? [];
  const codigosPresentes = new Set(presentes.map((p) => p.codigo));

  const leyendaTexto = (form.leyenda_alergenos_declarada ?? "").trim();
  const contieneFraseGlutenProhibida = /CONTIENE\s+GLUTEN/i.test(leyendaTexto);
  const rangoTermicoInvalido =
    form.temp_conservacion_min_c != null &&
    form.temp_conservacion_max_c != null &&
    form.temp_conservacion_min_c > form.temp_conservacion_max_c;

  const actualizarPresentes = (nuevos: AlergenoRotuloItem[]) => {
    const cods = new Set(nuevos.map((x) => x.codigo));
    const cruzadaFiltrada = cruzada.filter((c) => !cods.has(c.codigo));
    const nuevaLeyenda = generarLeyendaAlergenosLocal(nuevos, cruzadaFiltrada);
    setForm((p) => ({
      ...p,
      alergenos_presentes_json: nuevos,
      alergenos_contaminacion_cruzada_json: cruzadaFiltrada,
      leyenda_alergenos_declarada: nuevaLeyenda,
    }));
  };

  const actualizarCruzada = (nuevos: AlergenoRotuloItem[]) => {
    const nuevaLeyenda = generarLeyendaAlergenosLocal(presentes, nuevos);
    setForm((p) => ({
      ...p,
      alergenos_contaminacion_cruzada_json: nuevos,
      leyenda_alergenos_declarada: nuevaLeyenda,
    }));
  };

  const estaConfirmado =
    estadoValidacion === "CONFIRMADO" || confirmacionMarcadaEnForm;

  const detalleConfirmacionTooltip =
    confirmacionMarcadaEnForm && estadoValidacion !== "CONFIRMADO"
      ? "Confirmación lista para guardar al presionar Guardar datos del rótulo"
      : `Confirmado${confirmadoPorNombre ? ` por ${confirmadoPorNombre}` : ""}${
          fechaConfirmacion ? ` el ${formatearFechaISO(fechaConfirmacion)}` : ""
        }`;

  return (
    <Card.Root variant='outline' bg='white' shadow='xs'>
      <Card.Header pb={2}>
        <HStack justify='space-between' align='center' flexWrap='wrap' gap={2}>
          <HStack gap={2} flexWrap='wrap' align='center'>
            <Icon as={FiShield} color='teal.600' boxSize={5} />
            <Heading size='md' color='gray.800'>
              6. Alérgenos (Art. 235 séptimo CAA) y Condiciones de Conservación
            </Heading>
            {estaConfirmado ? (
              <Badge
                colorPalette='green'
                variant='subtle'
                size='sm'
                title={detalleConfirmacionTooltip}
                cursor='help'
              >
                <Icon as={FiCheckCircle} mr={1} />
                {confirmacionMarcadaEnForm && estadoValidacion !== "CONFIRMADO"
                  ? "Listo para confirmar"
                  : "Confirmado"}
                <Icon as={FiInfo} ml={1} />
              </Badge>
            ) : (
              <Badge
                colorPalette='blue'
                variant='subtle'
                size='sm'
                title='Propuesta sugerida por el sistema (pendiente de confirmación)'
                cursor='help'
              >
                Sugerida por el sistema
                <Icon as={FiInfo} ml={1} />
              </Badge>
            )}
          </HStack>

          <BadgeEstadoRotulo
            modificado={alergenosDifiere}
            etiquetaAuto='Alérgenos sincronizados con receta activa'
            puedeRestaurar={autocompletado.tiene_receta_activa}
            onRestaurar={() => {
              const nuevosPres =
                autocompletado.alergenos_presentes_calculados.map((a) => ({
                  ...a,
                }));
              const cods = new Set(nuevosPres.map((x) => x.codigo));
              const cruzFilt = cruzada.filter((c) => !cods.has(c.codigo));
              setForm((p) => ({
                ...p,
                alergenos_presentes_json: nuevosPres,
                alergenos_contaminacion_cruzada_json: cruzFilt,
                leyenda_alergenos_declarada: generarLeyendaAlergenosLocal(
                  nuevosPres,
                  cruzFilt,
                ),
              }));
            }}
          />
        </HStack>
      </Card.Header>

      <Card.Body pt={2} gap={5}>
        {confirmacionInvalidada && (
          <Box
            p={3.5}
            bg='orange.50'
            borderWidth='1px'
            borderColor='orange.300'
            borderRadius='md'
          >
            <HStack align='start' gap={2.5}>
              <Icon
                as={FiAlertTriangle}
                color='orange.600'
                boxSize={5}
                mt={0.5}
              />
              <Text fontSize='sm' color='orange.900' fontWeight='medium'>
                La receta activa o los alérgenos de sus insumos fueron
                modificados. La confirmación anterior se invalidó y el sistema
                generó una nueva propuesta sugerida para que la revises y
                vuelvas a confirmar.
              </Text>
            </HStack>
          </Box>
        )}

        {!autocompletado.tiene_receta_activa && <AvisoSinRecetaActiva />}

        {/* Trazabilidad desde receta activa */}
        {autocompletado.tiene_receta_activa && (
          <Box
            p={3}
            bg='gray.50'
            borderRadius='md'
            borderWidth='1px'
            borderColor='gray.200'
          >
            <Text fontSize='xs' fontWeight='bold' color='gray.700' mb={2}>
              Detección automática desde insumos de la receta activa (
              {autocompletado.receta_codigo}):
            </Text>
            {autocompletado.detalle_origen_alergenos.length === 0 ? (
              <Text fontSize='xs' color='gray.600'>
                Ningún insumo de la receta activa declara alérgenos mayores ni
                cereales con gluten del Art. 235 séptimo del CAA.
              </Text>
            ) : (
              <HStack gap={2} flexWrap='wrap'>
                {autocompletado.detalle_origen_alergenos.map((orig) => (
                  <Badge key={orig.codigo} colorPalette='blue' variant='subtle'>
                    {orig.es_derivado
                      ? `DERIVADO DE ${orig.etiqueta}`
                      : orig.etiqueta}{" "}
                    ({orig.insumos_fuente.join(", ")})
                  </Badge>
                ))}
              </HStack>
            )}
          </Box>
        )}

        {/* Sub-bloque A: Alérgenos presentes (CONTIENE...) */}
        <Box>
          <Text fontSize='sm' fontWeight='bold' color='gray.800' mb={1}>
            Alérgenos presentes en el producto (CONTIENE...)
          </Text>
          <Text fontSize='xs' color='gray.600' mb={3}>
            El CAA exige declarar cereales específicos (trigo, avena, cebada,
            centeno) en lugar de &quot;contiene gluten&quot;.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={2.5}>
            {CATALOGO_ALERGENOS_CAA.map((item) => {
              const encontrado = presentes.find(
                (p) => p.codigo === item.codigo,
              );
              const activo = Boolean(encontrado);
              return (
                <HStack key={item.codigo} align='center' gap={3} minH='24px'>
                  <Checkbox.Root
                    checked={activo}
                    onCheckedChange={(details) => {
                      if (Boolean(details.checked)) {
                        actualizarPresentes([
                          ...presentes,
                          { codigo: item.codigo, es_derivado: false },
                        ]);
                      } else {
                        actualizarPresentes(
                          presentes.filter((p) => p.codigo !== item.codigo),
                        );
                      }
                    }}
                    colorPalette='green'
                    size='sm'
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label fontSize='sm'>{item.label}</Checkbox.Label>
                  </Checkbox.Root>

                  {activo && (
                    <SegmentGroup.Root
                      size='xs'
                      colorPalette='green'
                      bg='gray.100'
                      value={encontrado?.es_derivado ? "Derivado" : "Directo"}
                      onValueChange={(details) =>
                        actualizarPresentes(
                          presentes.map((p) =>
                            p.codigo === item.codigo
                              ? {
                                  ...p,
                                  es_derivado: details.value === "Derivado",
                                }
                              : p,
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
        </Box>

        {/* Sub-bloque B: Contaminación cruzada manual (PUEDE CONTENER...) */}
        <Box>
          <Text fontSize='sm' fontWeight='bold' color='gray.800' mb={1}>
            Contaminación cruzada en planta (PUEDE CONTENER...)
          </Text>
          <Text fontSize='xs' color='gray.600' mb={3}>
            Seleccioná alérgenos por contacto accidental en líneas compartidas
            (se deshabilitan los ya declarados como presentes).
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={2.5}>
            {CATALOGO_ALERGENOS_CAA.map((item) => {
              const yaPresente = codigosPresentes.has(item.codigo);
              const encontrado = cruzada.find((c) => c.codigo === item.codigo);
              const activo = !yaPresente && Boolean(encontrado);
              return (
                <HStack
                  key={item.codigo}
                  align='center'
                  gap={3}
                  minH='24px'
                  opacity={yaPresente ? 0.5 : 1}
                >
                  <Checkbox.Root
                    checked={activo}
                    disabled={yaPresente}
                    onCheckedChange={(details) => {
                      if (Boolean(details.checked)) {
                        actualizarCruzada([
                          ...cruzada,
                          { codigo: item.codigo, es_derivado: false },
                        ]);
                      } else {
                        actualizarCruzada(
                          cruzada.filter((c) => c.codigo !== item.codigo),
                        );
                      }
                    }}
                    colorPalette='green'
                    size='sm'
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label fontSize='sm'>{item.label}</Checkbox.Label>
                  </Checkbox.Root>

                  {activo && (
                    <SegmentGroup.Root
                      size='xs'
                      colorPalette='green'
                      bg='gray.100'
                      value={encontrado?.es_derivado ? "Derivado" : "Directo"}
                      onValueChange={(details) =>
                        actualizarCruzada(
                          cruzada.map((c) =>
                            c.codigo === item.codigo
                              ? {
                                  ...c,
                                  es_derivado: details.value === "Derivado",
                                }
                              : c,
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
        </Box>

        {/* Sub-bloque C: Vista previa reglamentaria en MAYÚSCULAS Y NEGRITA */}
        <Box
          p={4}
          bg='gray.50'
          borderWidth='1px'
          borderColor='gray.300'
          borderRadius='md'
        >
          <VStack align='stretch' gap={3}>
            <Text
              fontSize='xs'
              fontWeight='bold'
              color='gray.600'
              textTransform='uppercase'
            >
              Vista previa reglamentaria en rótulo (Art. 235 séptimo CAA —
              Mayúsculas y Negrita)
            </Text>
            <Text
              fontSize='md'
              fontWeight='bold'
              textTransform='uppercase'
              color={leyendaTexto ? "gray.900" : "gray.400"}
            >
              {leyendaTexto ||
                "SIN ALÉRGENOS NI CONTAMINACIÓN CRUZADA DECLARADA."}
            </Text>

            {contieneFraseGlutenProhibida && (
              <Text fontSize='xs' color='red.600' fontWeight='semibold'>
                Advertencia CAA: El Art. 235 séptimo no permite declarar
                &quot;CONTIENE GLUTEN&quot;; debés indicar el cereal específico
                (TRIGO, AVENA, CEBADA o CENTENO).
              </Text>
            )}

            <Field.Root>
              <Field.Label fontSize='xs' fontWeight='semibold' color='gray.700'>
                Texto final de declaración de alérgenos (editable si requiere
                ajuste)
              </Field.Label>
              <Textarea
                rows={2}
                bg='white'
                value={form.leyenda_alergenos_declarada ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    leyenda_alergenos_declarada: e.target.value.toUpperCase(),
                  }))
                }
                placeholder='CONTIENE ...'
              />
            </Field.Root>
          </VStack>
        </Box>

        {/* Sub-bloque D: Condiciones de conservación e instrucciones */}
        <Box pt={2} borderTopWidth='1px' borderColor='gray.200'>
          <HStack
            justify='space-between'
            align='center'
            flexWrap='wrap'
            gap={2}
            mb={3}
          >
            <HStack gap={2}>
              <Icon as={FiThermometer} color='teal.600' boxSize={4} />
              <Text fontWeight='bold' fontSize='sm' color='gray.800'>
                Condiciones de Conservación, Durabilidad e Instrucciones de Uso
              </Text>
            </HStack>
            <BadgeEstadoRotulo
              modificado={conservacionDifiere}
              etiquetaAuto='Conservación según sugerencia'
              puedeRestaurar={Boolean(autocompletado.conservacion_sugerida)}
              onRestaurar={() => {
                const sug = autocompletado.conservacion_sugerida;
                if (!sug) return;
                setForm((p) => ({
                  ...p,
                  temp_conservacion_min_c: sug.temp_conservacion_min_c ?? null,
                  temp_conservacion_max_c: sug.temp_conservacion_max_c ?? null,
                  durabilidad_antes_abrir: sug.durabilidad_antes_abrir ?? "",
                  durabilidad_despues_abrir:
                    sug.durabilidad_despues_abrir ?? "",
                  condiciones_conservacion: sug.condiciones_conservacion ?? "",
                }));
              }}
            />
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 4 }} gap={4} mb={4}>
            <Field.Root>
              <Field.Label fontSize='sm' fontWeight='semibold'>
                Temperatura mínima (°C)
              </Field.Label>
              <Input
                type='number'
                step='0.5'
                value={form.temp_conservacion_min_c ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    temp_conservacion_min_c:
                      e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                placeholder='Ej: 15'
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize='sm' fontWeight='semibold'>
                Temperatura máxima (°C)
              </Field.Label>
              <Input
                type='number'
                step='0.5'
                value={form.temp_conservacion_max_c ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    temp_conservacion_max_c:
                      e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                placeholder='Ej: 25'
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize='sm' fontWeight='semibold'>
                Durabilidad antes de abrir
              </Field.Label>
              <Input
                value={form.durabilidad_antes_abrir ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    durabilidad_antes_abrir: e.target.value,
                  }))
                }
                placeholder='Ej: 21 días en envase cerrado'
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize='sm' fontWeight='semibold'>
                Durabilidad después de abrir
              </Field.Label>
              <Input
                value={form.durabilidad_despues_abrir ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    durabilidad_despues_abrir: e.target.value,
                  }))
                }
                placeholder='Ej: Consumir dentro de los 5 días'
              />
            </Field.Root>
          </SimpleGrid>

          {rangoTermicoInvalido && (
            <Text fontSize='xs' color='orange.600' fontWeight='semibold' mb={3}>
              Atención: la temperatura mínima ({form.temp_conservacion_min_c}{" "}
              °C) es mayor que la máxima ({form.temp_conservacion_max_c} °C).
            </Text>
          )}

          <VStack align='stretch' gap={3}>
            <Field.Root>
              <Field.Label fontSize='sm' fontWeight='semibold'>
                Condiciones generales de conservación
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
                placeholder='Ej: Conservar en lugar fresco y seco (15 °C a 25 °C), al abrigo de la luz solar.'
              />
            </Field.Root>

            <Checkbox.Root
              checked={form.aplica_instrucciones_uso}
              onCheckedChange={(details) =>
                setForm((p) => ({
                  ...p,
                  aplica_instrucciones_uso: Boolean(details.checked),
                }))
              }
              colorPalette='teal'
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontSize='sm'>
                El producto requiere instrucciones de uso, preparación o cocción
              </Checkbox.Label>
            </Checkbox.Root>

            {form.aplica_instrucciones_uso && (
              <Field.Root>
                <Field.Label fontSize='sm' fontWeight='semibold'>
                  Instrucciones de uso / cocción
                </Field.Label>
                <Textarea
                  rows={3}
                  value={form.instrucciones_uso ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      instrucciones_uso: e.target.value,
                    }))
                  }
                  placeholder='Detalle cómo preparar, reconstituir o cocinar el producto...'
                />
              </Field.Root>
            )}
          </VStack>
        </Box>

        {/* Botón de confirmación */}
        <HStack justify='flex-end' pt={2}>
          <Button
            type='button'
            colorPalette={estaConfirmado ? "green" : "blue"}
            variant={estaConfirmado ? "subtle" : "solid"}
            onClick={onMarcarConfirmacion}
            disabled={estaConfirmado}
          >
            <FiCheckCircle />
            {estaConfirmado
              ? "Declaración confirmada"
              : "Confirmar declaración de alérgenos y conservación"}
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
};
