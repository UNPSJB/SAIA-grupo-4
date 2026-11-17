import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiRefreshCw, FiSave, FiSliders } from "react-icons/fi";
import { AlertConfirm, AlertMessage, LoadingState } from "../../components/ui";
import { configuracionNutricionalApi } from "./hooks/configuracionNutricionalApi";
import type { ParametroNutricional } from "./types";

const formatearFechaHoraLocal = (iso: string): string => {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      });
};

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

export const VistaConfiguracionNutricional = () => {
  const [filas, setFilas] = useState<ParametroEditable[]>([]);
  const [filasIniciales, setFilasIniciales] = useState<ParametroEditable[]>([]);
  const [ultimaModificacion, setUltimaModificacion] = useState<{
    fecha: string;
    autor: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [confirmRestaurar, setConfirmRestaurar] = useState(false);

  const actualizarMetaModificacion = (items: ParametroNutricional[]) => {
    const conFecha = items.filter((p) => p.fecha_modificacion);
    if (conFecha.length === 0) {
      setUltimaModificacion(null);
      return;
    }
    const masReciente = conFecha.reduce((acc, cur) =>
      new Date(cur.fecha_modificacion!).getTime() >
      new Date(acc.fecha_modificacion!).getTime()
        ? cur
        : acc,
    );
    setUltimaModificacion({
      fecha: masReciente.fecha_modificacion!,
      autor: masReciente.modificado_por_nombre ?? null,
    });
  };

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await configuracionNutricionalApi.listarParametros();
      const editables = aEditable(data);
      setFilas(editables);
      setFilasIniciales(editables);
      actualizarMetaModificacion(data);
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
      const editables = aEditable(actualizados);
      setFilas(editables);
      setFilasIniciales(editables);
      actualizarMetaModificacion(actualizados);
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
      const editables = aEditable(restaurados);
      setFilas(editables);
      setFilasIniciales(editables);
      actualizarMetaModificacion(restaurados);
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

  const hayCambios =
    filasIniciales.length > 0 &&
    filas.some((f, idx) => {
      const ini = filasIniciales[idx];
      return (
        !ini ||
        f.vdr.trim() !== ini.vdr.trim() ||
        f.decimales.trim() !== ini.decimales.trim() ||
        f.umbral_no_significativo.trim() !== ini.umbral_no_significativo.trim() ||
        f.texto_no_significativo.trim() !== ini.texto_no_significativo.trim() ||
        f.factor_conversion_kj.trim() !== ini.factor_conversion_kj.trim()
      );
    });

  return (
    <Card.Root variant="outline" bg="white" shadow="xs">
      <Card.Header pb={3}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <HStack gap={2.5}>
            <Icon as={FiSliders} boxSize={5} color="teal.600" />
            <Box>
              <Heading size="md" color="gray.800">
                Configuración Nutricional (CAA / Mercosur)
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Parámetros normativos (dieta 2.000 kcal), redondeo y umbrales de cantidad no significativa.
              </Text>
              {ultimaModificacion && (
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  Última modificación: {formatearFechaHoraLocal(ultimaModificacion.fecha)}
                  {ultimaModificacion.autor ? ` por ${ultimaModificacion.autor}` : ""}
                </Text>
              )}
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
              disabled={loading || !hayCambios}
            >
              <Icon as={FiSave} />
              Guardar cambios
            </Button>
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0}>
        <VStack align="stretch" gap={4}>
          {error && <AlertMessage type="error" message={error} />}
          {mensajeExito && <AlertMessage type="success" message={mensajeExito} />}

          {loading ? (
            <LoadingState message="Cargando parámetros nutricionales..." />
          ) : (
            <Box
              overflowX="auto"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
            >
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
          )}
        </VStack>
      </Card.Body>

      <AlertConfirm
        open={confirmRestaurar}
        onCancel={() => setConfirmRestaurar(false)}
        onConfirm={handleRestaurar}
        title="Restaurar valores por defecto"
        message="¿Estás seguro de restablecer todos los parámetros a los valores por defecto del CAA? Se perderán las personalizaciones."
        confirmLabel="Restaurar"
      />
    </Card.Root>
  );
};
