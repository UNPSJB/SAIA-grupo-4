import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiRefreshCw, FiSave, FiShield, FiSliders } from "react-icons/fi";
import { ListadoContainer } from "../components/layout";
import { AlertConfirm, AlertMessage, LoadingState } from "../components/ui";
import { configuracionNutricionalApi } from "../features/configuracionNutricional/hooks/configuracionNutricionalApi";
import type {
  NormativaRotulado,
  NormativaRotuladoUpdate,
  ParametroNutricional,
} from "../features/configuracionNutricional/types";

interface ParametroEditable {
  codigo_nutriente: string;
  nombre_etiqueta: string;
  unidad: string;
  nivel_indentacion: number;
  permite_vdr: boolean;
  vdr: string;
  decimales: string;
  umbral_no_significativo: string;
  texto_no_significativo: string;
  factor_conversion_kj: string;
}

const aEditable = (items: ParametroNutricional[]): ParametroEditable[] =>
  items.map((p) => ({
    codigo_nutriente: p.codigo_nutriente,
    nombre_etiqueta: p.nombre_etiqueta,
    unidad: p.unidad,
    nivel_indentacion: p.nivel_indentacion,
    permite_vdr: p.permite_vdr,
    vdr: p.vdr != null ? String(p.vdr) : "",
    decimales: String(p.decimales),
    umbral_no_significativo:
      p.umbral_no_significativo != null ? String(p.umbral_no_significativo) : "",
    texto_no_significativo: p.texto_no_significativo ?? "",
    factor_conversion_kj:
      p.factor_conversion_kj != null ? String(p.factor_conversion_kj) : "",
  }));

export default function ConfiguracionNutricionalPage() {
  const [filas, setFilas] = useState<ParametroEditable[]>([]);
  const [normativa, setNormativa] = useState<NormativaRotulado | null>(null);
  const [normativaForm, setNormativaForm] = useState<NormativaRotuladoUpdate | null>(null);
  const [guardandoNormativa, setGuardandoNormativa] = useState(false);
  const [confirmGuardarNormativa, setConfirmGuardarNormativa] = useState(false);
  const [confirmRestaurarNormativa, setConfirmRestaurarNormativa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [confirmRestaurar, setConfirmRestaurar] = useState(false);

  const cargarNormativaAForm = (n: NormativaRotulado) => {
    setNormativa(n);
    setNormativaForm({
      nombre: n.nombre,
      version: n.version,
      requiere_envasado_ausencia_cliente: n.requiere_envasado_ausencia_cliente,
      evalua_azucares_agregados: n.evalua_azucares_agregados,
      evalua_grasas_agregadas: n.evalua_grasas_agregadas,
      evalua_sodio_agregado: n.evalua_sodio_agregado,
      evalua_edulcorantes: n.evalua_edulcorantes,
      evalua_cafeina: n.evalua_cafeina,
      descripcion: n.descripcion ?? "",
    });
  };

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, norma] = await Promise.all([
        configuracionNutricionalApi.listarParametros(),
        configuracionNutricionalApi.obtenerNormativaRotulado(),
      ]);
      setFilas(aEditable(data));
      cargarNormativaAForm(norma);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo cargar la configuración nutricional.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    if (!mensajeExito) return;
    const timer = setTimeout(() => setMensajeExito(""), 4000);
    return () => clearTimeout(timer);
  }, [mensajeExito]);

  const actualizarCampo = (
    codigo: string,
    campo: keyof ParametroEditable,
    valor: string,
  ) => {
    setMensajeExito("");
    setFilas((prev) =>
      prev.map((item) =>
        item.codigo_nutriente === codigo ? { ...item, [campo]: valor } : item,
      ),
    );
  };

  const handleGuardar = async () => {
    setError("");
    setMensajeExito("");
    setGuardando(true);
    try {
      const payload = filas.map((f) => {
        const dec = Number(f.decimales);
        if (!Number.isInteger(dec) || dec < 0 || dec > 3) {
          throw new Error(
            `Los decimales de '${f.nombre_etiqueta}' deben ser un entero entre 0 y 3.`,
          );
        }
        const vdrNum = f.permite_vdr && f.vdr.trim() !== "" ? Number(f.vdr) : null;
        if (f.permite_vdr && vdrNum !== null && (Number.isNaN(vdrNum) || vdrNum <= 0)) {
          throw new Error(`El VDR de '${f.nombre_etiqueta}' debe ser mayor a 0.`);
        }
        const umbralNum =
          f.umbral_no_significativo.trim() !== ""
            ? Number(f.umbral_no_significativo)
            : null;
        if (umbralNum !== null && (Number.isNaN(umbralNum) || umbralNum < 0)) {
          throw new Error(
            `El umbral no significativo de '${f.nombre_etiqueta}' debe ser >= 0.`,
          );
        }
        const factorKj =
          f.codigo_nutriente === "valor_energetico" && f.factor_conversion_kj.trim() !== ""
            ? Number(f.factor_conversion_kj)
            : null;
        if (factorKj !== null && (Number.isNaN(factorKj) || factorKj <= 0)) {
          throw new Error("El factor de conversión a kJ debe ser mayor a 0.");
        }

        return {
          codigo_nutriente: f.codigo_nutriente,
          vdr: vdrNum,
          decimales: dec,
          umbral_no_significativo: umbralNum,
          texto_no_significativo: f.texto_no_significativo.trim() || null,
          factor_conversion_kj: factorKj,
        };
      });

      const actualizados = await configuracionNutricionalApi.actualizarParametros(payload);
      setFilas(aEditable(actualizados));
      setMensajeExito("Parámetros nutricionales guardados correctamente.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron guardar los parámetros nutricionales.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleRestaurar = async () => {
    setConfirmRestaurar(false);
    setError("");
    setMensajeExito("");
    setGuardando(true);
    try {
      const restaurados = await configuracionNutricionalApi.restaurarDefecto();
      setFilas(aEditable(restaurados));
      setMensajeExito("Se restauraron los valores normativos CAA / Mercosur por defecto.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron restaurar los valores por defecto.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const hayCambiosNormativa =
    normativa != null &&
    normativaForm != null &&
    (normativaForm.nombre.trim() !== normativa.nombre ||
      normativaForm.version.trim() !== normativa.version ||
      (normativaForm.descripcion?.trim() || null) !== (normativa.descripcion || null) ||
      normativaForm.requiere_envasado_ausencia_cliente !==
        normativa.requiere_envasado_ausencia_cliente ||
      normativaForm.evalua_azucares_agregados !== normativa.evalua_azucares_agregados ||
      normativaForm.evalua_grasas_agregadas !== normativa.evalua_grasas_agregadas ||
      normativaForm.evalua_sodio_agregado !== normativa.evalua_sodio_agregado ||
      normativaForm.evalua_edulcorantes !== normativa.evalua_edulcorantes ||
      normativaForm.evalua_cafeina !== normativa.evalua_cafeina);

  const handleGuardarNormativa = async () => {
    setConfirmGuardarNormativa(false);
    if (!normativaForm || !hayCambiosNormativa) return;
    if (!normativaForm.nombre.trim() || !normativaForm.version.trim()) {
      setError("El nombre y la versión de la normativa de rotulado frontal son obligatorios.");
      return;
    }
    setError("");
    setMensajeExito("");
    setGuardandoNormativa(true);
    try {
      const actualizada = await configuracionNutricionalApi.actualizarNormativaRotulado({
        ...normativaForm,
        nombre: normativaForm.nombre.trim(),
        version: normativaForm.version.trim(),
        descripcion: normativaForm.descripcion?.trim() || null,
      });
      cargarNormativaAForm(actualizada);
      setMensajeExito("Normativa de rotulado frontal actualizada correctamente.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar la normativa de rotulado frontal.",
      );
    } finally {
      setGuardandoNormativa(false);
    }
  };

  const handleRestaurarNormativa = async () => {
    setConfirmRestaurarNormativa(false);
    setError("");
    setMensajeExito("");
    setGuardandoNormativa(true);
    try {
      const restaurada = await configuracionNutricionalApi.restaurarNormativaRotuladoDefecto();
      cargarNormativaAForm(restaurada);
      setMensajeExito("Se restauró la normativa de rotulado frontal Ley 27.642 por defecto.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo restaurar la normativa de rotulado frontal.",
      );
    } finally {
      setGuardandoNormativa(false);
    }
  };

  return (
    <ListadoContainer>
      <VStack align="stretch" gap={5}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <HStack gap={2.5}>
            <Icon as={FiSliders} boxSize={6} color="teal.600" />
            <Box>
              <Heading size="xl" color="gray.800">
                Configuración Nutricional
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Parámetros normativos CAA / Mercosur (dieta 2.000 kcal), redondeo y umbrales de cantidad no significativa.
              </Text>
            </Box>
          </HStack>

          <HStack gap={2}>
            <Button
              variant="outline"
              colorPalette="gray"
              size="sm"
              onClick={() => setConfirmRestaurar(true)}
              disabled={loading || guardando}
            >
              <Icon as={FiRefreshCw} />
              Restaurar CAA / Mercosur
            </Button>
            <Button
              colorPalette="green"
              size="sm"
              onClick={handleGuardar}
              loading={guardando}
              disabled={loading}
            >
              <Icon as={FiSave} />
              Guardar cambios
            </Button>
          </HStack>
        </HStack>

        {error && <AlertMessage type="error" message={error} />}
        {mensajeExito && <AlertMessage type="success" message={mensajeExito} />}

        {loading ? (
          <LoadingState message="Cargando parámetros nutricionales..." />
        ) : (
          <Card.Root variant="outline" bg="white" shadow="xs">
            <Card.Body p={0}>
              <Box overflowX="auto">
                <Table.Root size="sm" variant="line">
                  <Table.Header bg="gray.50">
                    <Table.Row>
                      <Table.ColumnHeader>Nutriente</Table.ColumnHeader>
                      <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                      <Table.ColumnHeader>VDR (Dieta 2.000 kcal)</Table.ColumnHeader>
                      <Table.ColumnHeader>Decimales</Table.ColumnHeader>
                      <Table.ColumnHeader>Umbral no sig.</Table.ColumnHeader>
                      <Table.ColumnHeader>Texto no sig.</Table.ColumnHeader>
                      <Table.ColumnHeader>Factor kJ</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filas.map((fila) => (
                      <Table.Row key={fila.codigo_nutriente}>
                        <Table.Cell
                          pl={fila.nivel_indentacion === 0 ? 3 : fila.nivel_indentacion === 1 ? 7 : 10}
                          fontWeight={fila.nivel_indentacion === 0 ? "semibold" : "normal"}
                          fontSize="sm"
                          color="gray.800"
                          whiteSpace="nowrap"
                        >
                          {fila.nombre_etiqueta}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.600">
                          {fila.unidad}
                        </Table.Cell>
                        <Table.Cell minW="140px">
                          {fila.permite_vdr ? (
                            <Input
                              size="xs"
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={fila.vdr}
                              onChange={(e) =>
                                actualizarCampo(fila.codigo_nutriente, "vdr", e.target.value)
                              }
                            />
                          ) : (
                            <Badge colorPalette="gray" variant="subtle" size="sm">
                              No aplica (CAA)
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell w="90px">
                          <Input
                            size="xs"
                            type="number"
                            step="1"
                            min="0"
                            max="3"
                            value={fila.decimales}
                            onChange={(e) =>
                              actualizarCampo(fila.codigo_nutriente, "decimales", e.target.value)
                            }
                          />
                        </Table.Cell>
                        <Table.Cell w="120px">
                          <Input
                            size="xs"
                            type="number"
                            step="0.01"
                            min="0"
                            value={fila.umbral_no_significativo}
                            onChange={(e) =>
                              actualizarCampo(
                                fila.codigo_nutriente,
                                "umbral_no_significativo",
                                e.target.value,
                              )
                            }
                          />
                        </Table.Cell>
                        <Table.Cell minW="160px">
                          <Input
                            size="xs"
                            value={fila.texto_no_significativo}
                            placeholder='Ej. "0"'
                            onChange={(e) =>
                              actualizarCampo(
                                fila.codigo_nutriente,
                                "texto_no_significativo",
                                e.target.value,
                              )
                            }
                          />
                        </Table.Cell>
                        <Table.Cell w="110px">
                          {fila.codigo_nutriente === "valor_energetico" ? (
                            <Input
                              size="xs"
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={fila.factor_conversion_kj}
                              onChange={(e) =>
                                actualizarCampo(
                                  fila.codigo_nutriente,
                                  "factor_conversion_kj",
                                  e.target.value,
                                )
                              }
                            />
                          ) : (
                            <Text fontSize="xs" color="gray.400">
                              —
                            </Text>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card.Body>
          </Card.Root>
        )}

        {!loading && normativa && normativaForm && (
          <Card.Root variant="outline" bg="white" shadow="xs">
            <Card.Header pb={3}>
              <HStack justify="space-between" flexWrap="wrap" gap={3}>
                <HStack gap={2.5}>
                  <Icon as={FiShield} boxSize={5} color="green.600" />
                  <Box>
                    <HStack gap={2} flexWrap="wrap">
                      <Heading size="md" color="gray.800">
                        Normativa de Rotulado Frontal (Ley 27.642)
                      </Heading>
                      <Badge colorPalette="green" size="xs">
                        {normativa.codigo_normativa} · Activa
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">
                      Reglas configurables y versionadas utilizadas para dictaminar si corresponde evaluar sellos de advertencia.
                    </Text>
                  </Box>
                </HStack>

                <HStack gap={2}>
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    size="xs"
                    onClick={() => setConfirmRestaurarNormativa(true)}
                    disabled={guardandoNormativa}
                  >
                    <Icon as={FiRefreshCw} />
                    Restaurar Ley 27.642
                  </Button>
                  <Button
                    colorPalette="green"
                    size="xs"
                    onClick={() => setConfirmGuardarNormativa(true)}
                    loading={guardandoNormativa}
                    disabled={!hayCambiosNormativa}
                  >
                    <Icon as={FiSave} />
                    Guardar normativa
                  </Button>
                </HStack>
              </HStack>
            </Card.Header>
            <Card.Body pt={0}>
              <VStack align="stretch" gap={4}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={1}>
                      Nombre de la normativa
                    </Text>
                    <Input
                      size="sm"
                      value={normativaForm.nombre}
                      onChange={(e) =>
                        setNormativaForm((prev) =>
                          prev ? { ...prev, nombre: e.target.value } : prev,
                        )
                      }
                    />
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={1}>
                      Versión / Etapa vigente
                    </Text>
                    <Input
                      size="sm"
                      value={normativaForm.version}
                      onChange={(e) =>
                        setNormativaForm((prev) =>
                          prev ? { ...prev, version: e.target.value } : prev,
                        )
                      }
                    />
                  </Box>
                </SimpleGrid>

                <Box>
                  <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={1}>
                    Descripción / Referencia legal
                  </Text>
                  <Input
                    size="sm"
                    value={normativaForm.descripcion ?? ""}
                    onChange={(e) =>
                      setNormativaForm((prev) =>
                        prev ? { ...prev, descripcion: e.target.value } : prev,
                      )
                    }
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700" mb={2}>
                    Criterios y sustancias críticas evaluadas por la normativa activa
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={2.5}>
                    {(
                      [
                        {
                          key: "requiere_envasado_ausencia_cliente",
                          label: "Exige envasado en ausencia del cliente",
                        },
                        {
                          key: "evalua_azucares_agregados",
                          label: "Evalúa azúcares agregados",
                        },
                        {
                          key: "evalua_grasas_agregadas",
                          label: "Evalúa grasas agregadas",
                        },
                        {
                          key: "evalua_sodio_agregado",
                          label: "Evalúa sodio agregado",
                        },
                        {
                          key: "evalua_edulcorantes",
                          label: "Evalúa edulcorantes",
                        },
                        {
                          key: "evalua_cafeina",
                          label: "Evalúa cafeína",
                        },
                      ] as const
                    ).map((regla) => (
                      <Checkbox.Root
                        key={regla.key}
                        checked={Boolean(normativaForm[regla.key])}
                        onCheckedChange={(details) =>
                          setNormativaForm((prev) =>
                            prev ? { ...prev, [regla.key]: Boolean(details.checked) } : prev,
                          )
                        }
                        colorPalette="green"
                        size="sm"
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label fontSize="xs">{regla.label}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </SimpleGrid>
                </Box>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>

      <AlertConfirm
        open={confirmRestaurar}
        onCancel={() => setConfirmRestaurar(false)}
        onConfirm={handleRestaurar}
        title="Restaurar valores por defecto"
        message="¿Estás seguro de restablecer todos los parámetros a los valores por defecto del CAA? Se perderán las personalizaciones."
        confirmLabel="Restaurar"
      />

      <AlertConfirm
        open={confirmGuardarNormativa}
        onCancel={() => setConfirmGuardarNormativa(false)}
        onConfirm={handleGuardarNormativa}
        title="Confirmar nueva versión de normativa"
        message="¿Estás seguro de guardar los cambios? Se creará una nueva versión activa de la normativa de rotulado frontal; las recetas en borrador o activas sin lotes pasarán a evaluarse con esta versión, mientras que las recetas con lotes o inhabilitadas conservarán la anterior."
        confirmLabel="Guardar nueva versión"
        loading={guardandoNormativa}
      />

      <AlertConfirm
        open={confirmRestaurarNormativa}
        onCancel={() => setConfirmRestaurarNormativa(false)}
        onConfirm={handleRestaurarNormativa}
        title="Restaurar normativa Ley 27.642"
        message="¿Estás seguro de restablecer las reglas y versión de rotulado frontal a los valores por defecto de la Ley 27.642?"
        confirmLabel="Restaurar"
      />
    </ListadoContainer>
  );
};
